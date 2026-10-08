"""Example patients for the UI (Phase 7).

Deterministic fixed-rule picks from clean.csv (positional, no randomness):
2 high-risk CAD, 2 low-risk Normal, 2 mixed (exactly one vessel stenotic).
Labels (cad/lad/lcx/rca/cath) are stripped; scalars are JSON-safe.
"""

from __future__ import annotations

from typing import Any

import pandas as pd

from app.data import clean

DROP_LABELS = ["cad", "lad", "lcx", "rca", "cath"]


def _to_jsonable(value: Any) -> Any:
    if isinstance(value, bool):
        return int(value)
    if hasattr(value, "item"):
        try:
            return value.item()
        except (ValueError, AttributeError):
            pass
    return value


def get_samples() -> list[dict[str, Any]]:
    df, _ = clean()
    df = df.sort_index()
    high = df[df["cad"] == 1].iloc[:2]
    low = df[df["cad"] == 0].iloc[:2]
    vessels = df[["lad", "lcx", "rca"]]
    mixed = df[vessels.sum(axis=1) == 1].iloc[:2]
    picks = [
        ("high-risk CAD (angiography-positive case)", high),
        ("low-risk Normal (angiography-negative case)", low),
        ("mixed single-vessel case", mixed),
    ]
    samples: list[dict[str, Any]] = []
    for group_no, (desc, frame) in enumerate(picks, start=1):
        for i, (_, row) in enumerate(frame.iterrows(), start=1):
            inputs = {c: _to_jsonable(row[c]) for c in df.columns if c not in DROP_LABELS}
            samples.append({
                "id": f"sample-{group_no}-{i}",
                "description": f"{desc} #{i}",
                "inputs": inputs,
            })
    return samples


def samples_frame() -> pd.DataFrame:
    """Full labeled frame (for tests/debugging only, never served)."""
    df, _ = clean()
    return df
