"""API tests (Phase 7). Uses FastAPI TestClient; lifespan loads artifacts.

Pre-training expectations: /schema + /samples work (200); model routes
answer 503 with rerun guidance; validation still returns 422 first.
"""

import io

import pandas as pd
from fastapi.testclient import TestClient

from app.data import clean
from main import app

client = TestClient(app)


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}
    assert "X-Process-Time" in res.headers


def test_schema_matches_file():
    res = client.get("/schema")
    assert res.status_code == 200
    body = res.json()
    assert set(body["targets"]) == {"cad", "lad", "lcx", "rca", "cath"}
    assert len(body["features"]) == 54


def test_samples_have_no_labels():
    res = client.get("/samples")
    assert res.status_code == 200
    samples = res.json()
    assert len(samples) == 6
    for s in samples:
        assert set(s["inputs"]) == set(
            c for c in s["inputs"] if c not in {"cad", "lad", "lcx", "rca", "cath"}
        )
        assert "cad" not in s["inputs"] and "lad" not in s["inputs"]


def _one_valid_input() -> dict:
    df, _ = clean()
    row = df.iloc[0]
    return {
        c: (row[c].item() if hasattr(row[c], "item") else row[c])
        for c in df.columns
        if c not in {"cad", "lad", "lcx", "rca", "cath"}
    }


def test_predict_503_until_trained():
    res = client.post("/predict", json={"inputs": _one_valid_input()})
    assert res.status_code == 503
    assert "train" in res.json()["detail"].lower()


def test_predict_accepts_form_strings():
    """Form-style strings must coerce (503 = passed validation, untrained)."""
    body = _one_valid_input()
    body["sex"] = "Male"
    body["bbb"] = "LBBB"
    body["vhd"] = "Moderate"
    res = client.post("/predict", json={"inputs": body})
    assert res.status_code == 503
    bad = _one_valid_input()
    bad["sex"] = "Unknown"
    res = client.post("/predict", json={"inputs": bad})
    assert res.status_code == 422


def test_predict_rejects_leakage_keys_first():
    bad = _one_valid_input()
    bad["LAD"] = 1
    res = client.post("/predict", json={"inputs": bad})
    assert res.status_code == 422
    assert any("LAD" in str(e) for e in res.json()["detail"])


def test_predict_rejects_unknown_fields():
    bad = _one_valid_input()
    bad["hogwash"] = 3
    res = client.post("/predict", json={"inputs": bad})
    assert res.status_code == 422


def test_explain_503_until_trained():
    res = client.post("/explain", json={"inputs": _one_valid_input(), "target": "CAD"})
    assert res.status_code == 503


def test_explain_rejects_bad_target():
    res = client.post("/explain", json={"inputs": _one_valid_input(), "target": "NOPE"})
    assert res.status_code == 422


def test_metrics_503_until_trained():
    res = client.get("/metrics")
    assert res.status_code == 503


def _csv_bytes(frame: pd.DataFrame) -> bytes:
    buf = io.BytesIO()
    frame.to_csv(buf, index=False)
    return buf.getvalue()


def test_batch_bad_csv_422_lists_columns():
    df, _ = clean()
    feats = [c for c in df.columns if c not in {"cad", "lad", "lcx", "rca", "cath"}]
    bad = pd.DataFrame([{feats[0]: 1, "hogwash": 2}])
    res = client.post("/predict-batch", files={"file": ("up.csv", _csv_bytes(bad))})
    assert res.status_code == 422
    assert "hogwash" in str(res.json()["detail"])


def test_batch_row_limit_413():
    df, _ = clean()
    feats = [c for c in df.columns if c not in {"cad", "lad", "lcx", "rca", "cath"}]
    big = pd.DataFrame([{c: 0 for c in feats} for _ in range(201)])
    res = client.post("/predict-batch", files={"file": ("up.csv", _csv_bytes(big))})
    assert res.status_code == 413


def test_batch_byte_limit_413():
    res = client.post("/predict-batch", files={"file": ("up.csv", b"a,b\n" + b"x," * 1_100_000)})
    assert res.status_code == 413
