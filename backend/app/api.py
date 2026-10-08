"""HTTP routes (Phase 7). Model-dependent routes return 503 with rerun
guidance while training is deferred; /health, /schema, /samples work now.
"""

from __future__ import annotations

import io
from typing import Any

import pandas as pd
from fastapi import APIRouter, HTTPException, UploadFile
from pydantic import BaseModel

from app.config import TARGETS
from app.predict import (
    BATCH_ROW_LIMIT,
    MAX_UPLOAD_BYTES,
    TRAIN_GUIDANCE,
    ModelNotTrainedError,
    ensure_trained,
    metrics_payload,
    predict_one,
    validate_inputs,
)
from app.samples import get_samples
from app.schemas import (
    ExplainRequest,
    ExplainResponse,
    PredictRequest,
    PredictResponse,
    SamplePatient,
)

router = APIRouter()


class BatchRowResult(BaseModel):
    row: int
    prediction: PredictResponse | None = None
    errors: list[str] = []


@router.get("/schema")
def read_schema() -> dict[str, Any]:
    import json

    from app.config import DATA_DIR

    return json.loads((DATA_DIR / "feature_schema.json").read_text())


@router.get("/samples", response_model=list[SamplePatient])
def read_samples() -> list[dict[str, Any]]:
    return get_samples()


@router.post("/predict", response_model=PredictResponse)
def create_prediction(body: PredictRequest) -> dict[str, Any]:
    coerced, errors = validate_inputs(body.inputs)
    if errors:
        raise HTTPException(status_code=422, detail=errors)
    try:
        return predict_one(coerced)
    except ModelNotTrainedError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/explain", response_model=ExplainResponse)
def create_explanation(body: ExplainRequest) -> dict[str, Any]:
    if body.target not in TARGETS:
        raise HTTPException(status_code=422, detail=[f"Unknown target {body.target!r}."])
    coerced, errors = validate_inputs(body.inputs)
    if errors:
        raise HTTPException(status_code=422, detail=errors)
    try:
        ensure_trained()
    except ModelNotTrainedError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    # SHAP explainers land in Phase 6; models alone are not enough.
    raise HTTPException(
        status_code=503,
        detail="Explainability is pending (Phase 6 explainers not built yet).",
    )


@router.post("/predict-batch", response_model=list[BatchRowResult])
def create_batch_predictions(file: UploadFile) -> list[dict[str, Any]]:
    # Privacy: uploads are parsed in memory, never stored or logged.
    raw = file.file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=[f"Upload is {len(raw)} bytes; limit is {MAX_UPLOAD_BYTES}."],
        ) from None
    try:
        frame = pd.read_csv(io.BytesIO(raw))
    except Exception:
        raise HTTPException(status_code=422, detail=["Could not parse CSV upload."]) from None
    if len(frame) == 0:
        raise HTTPException(status_code=422, detail=["CSV upload is empty."])
    if len(frame) > BATCH_ROW_LIMIT:
        raise HTTPException(
            status_code=413,
            detail=[f"CSV has {len(frame)} rows; limit is {BATCH_ROW_LIMIT}."],
        )
    unknown = [
        c
        for c in frame.columns
        if str(c).strip().lower() not in _known_fields() | {"lad", "lcx", "rca", "cath", "cad"}
    ]
    if unknown:
        raise HTTPException(status_code=422, detail=[f"Unknown columns: {sorted(set(unknown))}."])
    try:
        ensure_trained()
    except ModelNotTrainedError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    results: list[dict[str, Any]] = []
    for i, (_, record) in enumerate(frame.iterrows()):
        coerced, errors = validate_inputs({str(k): _cell(v) for k, v in record.items()})
        if errors:
            results.append({"row": i, "prediction": None, "errors": errors})
        else:
            results.append({"row": i, "prediction": predict_one(coerced), "errors": []})
    return results


def _cell(value: Any) -> Any:
    if pd.isna(value):
        return None
    if hasattr(value, "item"):
        try:
            return value.item()
        except (ValueError, AttributeError):
            pass
    return value


def _known_fields() -> set[str]:
    import json

    from app.config import DATA_DIR

    schema = json.loads((DATA_DIR / "feature_schema.json").read_text())
    return set(schema["features"])


@router.get("/metrics")
def read_metrics() -> dict[str, Any]:
    payload = metrics_payload()
    if payload is None:
        raise HTTPException(
            status_code=503,
            detail="No metrics yet. " + TRAIN_GUIDANCE,
        )
    return payload
