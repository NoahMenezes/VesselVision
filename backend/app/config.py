"""Central configuration: paths, targets, leakage denylist.

Single source of truth so new features, models, or anatomy
can be added without a redesign.
"""

from __future__ import annotations

import os
from pathlib import Path

# --- Paths ---
BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent
DATA_DIR = Path(os.getenv("DATA_DIR", REPO_ROOT / "data"))
ARTIFACTS_DIR = Path(os.getenv("ARTIFACTS_DIR", BACKEND_DIR / "artifacts"))
PROCESSED_DIR = DATA_DIR / "processed"

# --- Targets (binary) ---
TARGET_CAD = "CAD"
TARGET_LAD = "LAD"
TARGET_LCX = "LCX"
TARGET_RCA = "RCA"
TARGETS: list[str] = [TARGET_CAD, TARGET_LAD, TARGET_LCX, TARGET_RCA]

# --- Leakage columns ---
# CRITICAL: never use vessel labels / cath result as features for any target,
# and never use one vessel label as a feature for another.
# Matching is case-insensitive substring on the *normalized* column name
# (see data.py). Keep this list short and explicit.
LEAKAGE_COLUMNS: list[str] = ["LAD", "LCX", "RCA", "Cath"]

# --- Misc ---
RANDOM_SEED = int(os.getenv("RANDOM_SEED", "42"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
