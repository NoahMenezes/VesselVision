"""API tests (Phase 7 + live Phase 5 artifacts).

Validation tests (422/413) use a bare client: they run before any trained
check, so they pass with or without models. Live tests use a lifespan client
that loads the joblib artifacts; they require Phase 5 output.
"""

import io

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.data import clean
from main import app

client = TestClient(app)


@pytest.fixture(scope="module")
def live():
    with TestClient(app) as c:
        yield c


def test_root_reports_trained_state():
    with TestClient(app) as c:
        body = c.get("/").json()
    assert body["service"] == "VesselVision API"
    assert body["models_trained"] is True


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


def test_predict_live(live):
    res = live.post("/predict", json={"inputs": _one_valid_input()})
    assert res.status_code == 200
    body = res.json()
    assert set(body) == {"cad", "vessels"}
    assert set(body["vessels"]) == {"LAD", "LCX", "RCA"}
    for risk in [body["cad"], *body["vessels"].values()]:
        assert 0.0 <= risk["probability"] <= 1.0
        assert risk["label"] in (0, 1)


def test_predict_accepts_form_strings(live):
    """Form-style strings must coerce to a live prediction."""
    body = _one_valid_input()
    body["sex"] = "Male"
    body["bbb"] = "LBBB"
    body["vhd"] = "Moderate"
    res = live.post("/predict", json={"inputs": body})
    assert res.status_code == 200
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


def test_explain_live(live):
    res = live.post("/explain", json={"inputs": _one_valid_input(), "target": "LAD"})
    assert res.status_code == 200
    body = res.json()
    assert body["target"] == "LAD"
    assert 1 <= len(body["contributions"]) <= 10
    assert all("shap_value" in c and "direction" in c for c in body["contributions"])


def test_explain_rejects_bad_target():
    res = client.post("/explain", json={"inputs": _one_valid_input(), "target": "NOPE"})
    assert res.status_code == 422


def test_metrics_live(live):
    res = live.get("/metrics")
    assert res.status_code == 200
    assert set(res.json()) == {"CAD", "LAD", "LCX", "RCA"}


def test_uncertainty_live(live):
    res = live.get("/uncertainty")
    assert res.status_code == 200
    body = res.json()
    assert set(body) == {"CAD", "LAD", "LCX", "RCA"}
    for band in body.values():
        assert band["plusminus"] >= 0
        assert 0 <= band["accuracy"] <= 100
        assert band["rounds"] == 15


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
