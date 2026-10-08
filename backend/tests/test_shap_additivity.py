"""SHAP additivity: sigmoid(base + sum(full shap vector)) == predict_proba.

Uses a throwaway single-threaded LogReg on CAD (seconds); asserts the margin
identity the UI relies on, not any particular model.
"""

from math import exp

from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from app.data import clean
from app.explain import _get, _margin_matrix, _patient_frame, _state
from app.features import build_preprocessor, get_feature_columns
from app.predict import validate_inputs


def _row_dict(df, feats):
    row = {}
    for c in feats:
        v = df[c].iloc[0]
        row[c] = v.item() if hasattr(v, "item") else v
    return row


def test_shap_additivity_cad_logreg():
    df, _ = clean()
    feats = get_feature_columns("CAD", list(df.columns))
    pipe = Pipeline([("pre", build_preprocessor(feats)), ("clf", LogisticRegression(max_iter=500))])
    pipe.fit(df[feats], df["cad"])
    _state["models"] = {"CAD": pipe}
    _state["medians"] = df.select_dtypes(include="number").median(numeric_only=True).to_dict()

    import app.explain as E

    E._explainers.clear()
    row = _row_dict(df, feats)
    coerced, errors = validate_inputs(row)
    assert not errors
    bundle = _get("CAD")
    Xt, _, _ = _patient_frame(coerced, bundle)
    base, mat = _margin_matrix(bundle, Xt)
    proba = float(bundle["clf"].predict_proba(Xt)[:, 1][0])
    assert abs(1 / (1 + exp(-(base + mat[0].sum()))) - proba) < 1e-6

    out = E.explain(row, "CAD")
    assert out["target"] == "CAD"
    assert len(out["contributions"]) <= 10
    assert out["method"].startswith("shap")
    E._explainers.clear()
    _state["models"] = None
