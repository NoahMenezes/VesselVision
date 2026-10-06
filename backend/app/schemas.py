"""Pydantic schemas for the API (Phase 1: placeholders, no ML)."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str = "ok"


class PatientInput(BaseModel):
    """Free-form patient record; strict validation arrives in Phase 7."""

    # Accept arbitrary fields so the schema-driven form (GET /schema)
    # can evolve without a redesign.
    model_config = {"extra": "allow"}

    def as_dict(self) -> dict[str, Any]:
        return self.model_dump()
