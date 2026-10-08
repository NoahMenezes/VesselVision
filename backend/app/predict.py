"""Inference: artifact loading, input validation, prediction (Phase 7).

- Artifacts load ONCE at startup (see main.py lifespan). If
  {target}_model.joblib files are absent (training deferred), every
  model-dependent route answers 503 with rerun guidance instead of
  failing obscurely. No mock numbers are ever returned.
- validate_inputs() checks keys/types against feature_schema.json BEFORE
  any trained check, so bad payloads get 422 even while untrained.
- Missing optional fields are filled with full-data medians/modes. This is
  descriptive imputation for serving only; Phase 5 recomputes statistics on
  its train split when fitting final models.
"""

from __future__ import annotations

from typing import Any

import joblib
import pandas as pd

from app.config import ARTIFACTS_DIR, DATA_DIR, TARGETS
from app.data import VHD_ORDER, clean
from app.features import get_feature_columns

BATCH_ROW_LIMIT = 200
MAX_UPLOAD_BYTES = 2_000_000  # ~10x a 200-row CSV; generous, blocks abuse
FORBIDDEN_INPUTS = {"lad", "lcx", "rca", "cath", "cad"}


class ModelNotTrainedError(RuntimeError):
    """Raised when model artifacts are absent."""


TRAIN_GUIDANCE = (
    "No trained models found in backend/artifacts/. "
    "Run the full training (`cd backend && uv run python -m app.train`) "
    "then Phase 5 evaluation to produce {target}_model.joblib."
)

_state: dict[str, Any] = {"models": None, "thresholds": {}, "medians": None}


def _schema() -> dict:
    import json

    return json.loads((DATA_DIR / "feature_schema.json").read_text())


def load_artifacts() -> dict[str, Any]:
    """Load models + thresholds once; never raises on missing files."""
    models: dict[str, Any] = {}
    for target in TARGETS:
        path = ARTIFACTS_DIR / f"{target.lower()}_model.joblib"
        if path.exists():
            models[target] = joblib.load(path)
    _state["models"] = models or None
    thresholds_path = ARTIFACTS_DIR / "thresholds.json"
    if thresholds_path.exists():
        import json

        _state["thresholds"] = json.loads(thresholds_path.read_text())
    # Serving must never die on data problems: without medians the API still
    # validates inputs, and prediction routes 503 via ensure_trained() first.
    try:
        df, _ = clean()
        num = df.select_dtypes(include="number").median(numeric_only=True)
        _state["medians"] = num.to_dict()
    except Exception:
        _state["medians"] = None
    _state["modes"] = {"bbb": "N"}
    return _state


def ensure_trained() -> dict[str, Any]:
    if _state["models"] is None:
        raise ModelNotTrainedError(TRAIN_GUIDANCE)
    return _state


def _coerce_value(name: str, kind: str, value: Any) -> Any:
    """Coerce one raw input to its clean representation or raise ValueError."""
    if name == "sex":
        if value in (0, 1, False, True):
            return int(value)
        s = str(value).strip().lower()
        if s in ("male", "m"):
            return 1
        if s in ("female", "f", "fmale"):  # 'Fmale' typo exists in source data
            return 0
        raise ValueError(f"{name!r} must be Male/Female or 1/0, got {value!r}")
    if kind == "binary":
        if isinstance(value, bool):
            return int(value)
        if isinstance(value, (int, float)) and value in (0, 1):
            return int(value)
        if isinstance(value, str) and value.strip().upper() in ("Y", "YES", "1"):
            return 1
        if isinstance(value, str) and value.strip().upper() in ("N", "NO", "0"):
            return 0
        raise ValueError(f"{name!r} must be 0/1 or Y/N, got {value!r}")
    if kind == "bbb" or name == "bbb":
        s = str(value).strip()
        upper = {"N": "N", "LBBB": "LBBB", "RBBB": "RBBB"}
        if s.upper() in upper:
            return upper[s.upper()]
        raise ValueError(f"{name!r} must be one of N/LBBB/RBBB, got {value!r}")
    if kind == "vhd" or name == "vhd":
        if isinstance(value, (int, float)) and int(value) in (0, 1, 2, 3):
            return int(value)
        inv = {k.lower(): v for k, v in VHD_ORDER.items()}
        if isinstance(value, str) and value.strip().lower() in inv:
            return inv[value.strip().lower()]
        raise ValueError(f"{name!r} must be 0-3 or N/mild/Moderate/Severe, got {value!r}")
    # numeric
    try:
        return float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{name!r} must be numeric, got {value!r}") from None


def validate_inputs(inputs: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    """Return (coerced_inputs, errors). Missing optional fields are OK."""
    schema = _schema()
    known = schema["features"]
    errors: list[str] = []
    coerced: dict[str, Any] = {}
    for raw_key, value in inputs.items():
        key = str(raw_key).strip().lower()
        if key in FORBIDDEN_INPUTS:
            errors.append(
                f"{raw_key!r} is a diagnosis label, not an input feature "
                "(LAD/LCX/RCA/Cath/CAD are never accepted as inputs)."
            )
            continue
        if key not in known:
            errors.append(f"Unknown field {raw_key!r}. See GET /schema for valid fields.")
            continue
        meta = known[key]
        kind = meta["kind"]
        # Named categoricals first: 'sex' has kind 'binary' in the registry
        # but needs its own Male/Female coercion, not 0/1-Y/N.
        if key in ("sex", "bbb", "vhd"):
            kind = key
        try:
            coerced[key] = _coerce_value(key, kind, value)
        except ValueError as exc:
            errors.append(str(exc))
    return coerced, errors


def _feature_row(coerced: dict[str, Any], target: str) -> pd.DataFrame:
    feats = get_feature_columns(target)
    row = {c: coerced.get(c, (_state["medians"] or {}).get(c)) for c in feats}
    row["bbb"] = coerced.get("bbb", (_state.get("modes") or {}).get("bbb", "N"))
    return pd.DataFrame([row], columns=feats)


def predict_one(inputs: dict[str, Any]) -> dict[str, Any]:
    """Full 4-target prediction dict. Raises ModelNotTrainedError if deferred."""
    state = ensure_trained()
    out: dict[str, Any] = {}
    vessels: dict[str, Any] = {}
    for target in TARGETS:
        proba = float(state["models"][target].predict_proba(_feature_row(inputs, target))[:, 1][0])
        threshold = float(state["thresholds"].get(target, 0.5))
        risk = {
            "probability": round(proba, 4),
            "label": int(proba >= threshold),
            "threshold": threshold,
        }
        if target == "CAD":
            out["cad"] = risk
        else:
            vessels[target] = risk
    out["vessels"] = vessels
    return out


def artifact_paths() -> dict[str, str]:
    return {t: str(ARTIFACTS_DIR / f"{t.lower()}_model.joblib") for t in TARGETS}


def metrics_payload() -> dict[str, Any] | None:
    import json

    path = ARTIFACTS_DIR / "metrics.json"
    if not path.exists():
        return None
    return json.loads(path.read_text())
