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


def _load_dotenv() -> None:
    """Load backend/.env into the environment (no extra dependency).
    Shell-exported variables always win; this only fills the gaps so
    `bun run all` picks up DATABASE_URL with zero setup."""
    env_file = BACKEND_DIR / ".env"
    if not env_file.is_file():
        return
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip().strip("'\"")
        if key and key not in os.environ:
            os.environ[key] = value


_load_dotenv()
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
