"""Neon Postgres checkup-history store (optional).

The API stays fully usable without a database: when DATABASE_URL is unset
(or Neon is unreachable) the /history endpoints answer 503 with setup
guidance and everything else works untouched. Stored rows are the user's
own demo data only: inputs plus the scores computed for them.
"""

from __future__ import annotations

import os
from typing import Any

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS history (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  label TEXT NOT NULL DEFAULT '',
  inputs JSONB NOT NULL,
  cad REAL NOT NULL,
  lad REAL NOT NULL,
  lcx REAL NOT NULL,
  rca REAL NOT NULL,
  cad_label INTEGER NOT NULL
);
"""

HISTORY_ROW_LIMIT = 100

_pool: Any | None = None


class HistoryUnavailable(Exception):
    """Raised when no database is configured, reachable, or installed."""


def reset_pool() -> None:
    """Drop the cached pool (tests switch DATABASE_URL mid-process)."""
    global _pool
    _pool = None


def _url() -> str:
    return os.getenv("DATABASE_URL", "")


async def _pool_conn() -> Any:
    global _pool
    try:
        import asyncpg
    except ImportError as exc:
        raise HistoryUnavailable("asyncpg is not installed (run: uv sync).") from exc
    if not _url():
        raise HistoryUnavailable("Set DATABASE_URL to enable history (see .env.example).")
    if _pool is None:
        _pool = await asyncpg.create_pool(_url(), min_size=1, max_size=5)
    return _pool


async def ensure_history_table() -> None:
    """Create the table if missing. Raises HistoryUnavailable when off."""
    pool = await _pool_conn()
    async with pool.acquire() as conn:
        await conn.execute(SCHEMA_SQL)


async def save_record(label: str, inputs: dict[str, Any], pred: dict[str, Any]) -> int:
    pool = await _pool_conn()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO history (label, inputs, cad, lad, lcx, rca, cad_label)"
            " VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
            label[:80],
            inputs,
            float(pred["cad"]["probability"]),
            float(pred["vessels"]["LAD"]["probability"]),
            float(pred["vessels"]["LCX"]["probability"]),
            float(pred["vessels"]["RCA"]["probability"]),
            int(pred["cad"]["label"]),
        )
        return int(row["id"])


async def list_records(limit: int = HISTORY_ROW_LIMIT) -> list[dict[str, Any]]:
    import json

    pool = await _pool_conn()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, created_at, label, inputs, cad, lad, lcx, rca, cad_label"
            " FROM history ORDER BY id DESC LIMIT $1",
            max(1, min(limit, HISTORY_ROW_LIMIT)),
        )
    out: list[dict[str, Any]] = []
    for r in rows:
        raw_inputs = r["inputs"]
        out.append(
            {
                "id": int(r["id"]),
                "created_at": r["created_at"].isoformat(),
                "label": r["label"],
                "inputs": json.loads(raw_inputs) if isinstance(raw_inputs, str) else dict(raw_inputs),
                "cad": float(r["cad"]),
                "lad": float(r["lad"]),
                "lcx": float(r["lcx"]),
                "rca": float(r["rca"]),
                "cad_label": int(r["cad_label"]),
            }
        )
    return out


async def delete_record(record_id: int) -> bool:
    pool = await _pool_conn()
    async with pool.acquire() as conn:
        status = await conn.execute("DELETE FROM history WHERE id = $1", record_id)
        return status.split()[-1] != "0"
