"""Pydantic schemas for the API (Phase 7).

Field-for-field compatible with frontend/src/lib/types.ts.
Validation of *values* against feature_schema.json lives in app.predict
(validate_inputs) so error messages stay friendly, not raw 422 dumps.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"


class PredictRequest(BaseModel):
    inputs: dict[str, Any] = Field(description="Patient fields keyed by clean column name")


class VesselRisk(BaseModel):
    probability: float = Field(ge=0.0, le=1.0)
    label: Literal[0, 1]
    threshold: float = Field(ge=0.0, le=1.0)


class PredictResponse(BaseModel):
    cad: VesselRisk
    vessels: dict[str, VesselRisk]  # exactly keys LAD, LCX, RCA


class ExplainRequest(BaseModel):
    inputs: dict[str, Any]
    target: str = Field(description="One of CAD, LAD, LCX, RCA")


class ShapContribution(BaseModel):
    feature: str
    label: str
    value: Any
    unit: str | None
    shap_value: float
    direction: Literal["increases", "decreases"]


class ExplainResponse(BaseModel):
    target: str
    probability: float
    base_value: float
    contributions: list[ShapContribution]  # top 10 by |shap_value|


class SamplePatient(BaseModel):
    id: str
    description: str
    inputs: dict[str, Any]  # labels stripped; JSON-safe scalars only


class ErrorResponse(BaseModel):
    detail: Any
