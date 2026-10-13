"""SHAP explainability per target (Phase 6).

- Explainers run on the PREPROCESSED feature space (the exact matrix the
  classifier sees): transform via ``pipeline.named_steps['pre']``, then
  TreeExplainer for tree models / LinearExplainer for logreg, with a small
  background sample. SMOTE-pipeline arms expose the classifier at
  ``named_steps['clf']`` (resampling is fit-time only).
- Transformed names come from ``get_feature_names_out`` and map back to
  human labels via the registry (``bbb_X`` dummies resolve to BBB).
- SHAP values live in MARGIN space: sigmoid(base + sum) == predict_proba.
  The API reports the probability plus directional contributions; the
  additivity test asserts the margin identity (test_shap_additivity).
- LIME tabular fallback if SHAP dispatch fails for an estimator, flagged
  with method="lime" so callers know.
- Explainers build lazily per target and are cached (request budget <300ms
  after first build, not counting first-build cost).
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from app.config import TARGETS
from app.data import clean
from app.features import get_feature_columns
from app.predict import _state, ensure_trained, validate_inputs

N_BACKGROUND = 50

_explainers: dict[str, dict[str, Any]] = {}


def _pre_names(pre, feats: list[str]) -> list[str]:
    try:
        return list(pre.get_feature_names_out())
    except Exception:
        return list(feats)


def _human_label(transformed: str, registry: dict) -> str:
    base = transformed.split("_")[0]
    return registry.get(base, {}).get("label", transformed)


def _raw_key(transformed: str, feats: list[str]) -> str:
    if transformed in feats:
        return transformed
    base = transformed.split("_")[0]
    return base if base in feats else transformed


def _base_pipeline(model):
    """Unwrap CalibratedClassifierCV to the fitted base pipeline (SHAP needs
    named_steps; calibration is fit-time only for explanation purposes)."""
    if type(model).__name__ == "CalibratedClassifierCV":
        return model.calibrated_classifiers_[0].estimator
    return model


def _build_explainer(target: str) -> dict[str, Any]:
    state = ensure_trained()
    pipe = _base_pipeline(state["models"][target])
    df, registry = clean()
    feats = get_feature_columns(target, list(df.columns))
    pre = pipe.named_steps["pre"]
    clf = pipe.named_steps["clf"]
    X = pre.transform(df[feats])
    names = _pre_names(pre, feats)
    rng = np.random.RandomState(42)
    idx = rng.choice(len(X), size=min(N_BACKGROUND, len(X)), replace=False)
    background = np.asarray(X[idx])
    est_name = type(clf).__name__
    if est_name in ("RandomForestClassifier", "XGBClassifier", "LGBMClassifier"):
        import shap

        try:
            explainer = shap.TreeExplainer(clf, data=background)
            # Probe: some XGBoost builds reject interventional perturbation.
            explainer.shap_values(background[:2])
            method = "shap-tree"
        except NotImplementedError:
            explainer = shap.TreeExplainer(clf, feature_perturbation="tree_path_dependent")
            method = "shap-tree-path"
    elif est_name == "LogisticRegression":
        import shap

        explainer = shap.LinearExplainer(clf, background)
        method = "shap-linear"
    else:  # pragma: no cover - unknown future estimators
        raise TypeError(f"No SHAP dispatch for {est_name}")
    return {
        "explainer": explainer,
        "method": method,
        "names": names,
        "registry": registry,
        "feats": feats,
        "pre": pre,
        "clf": clf,
        "background": background,
    }


def _get(target: str) -> dict[str, Any]:
    if target not in TARGETS:
        raise ValueError(f"Unknown target {target!r}")
    if target not in _explainers:
        _explainers[target] = _build_explainer(target)
    return _explainers[target]


def _patient_frame(coerced: dict[str, Any], bundle: dict) -> tuple[np.ndarray, pd.DataFrame, dict]:
    row: dict[str, Any] = {}
    medians = _state.get("medians") or {}
    for c in bundle["feats"]:
        row[c] = coerced.get(c, medians.get(c))
    row["bbb"] = coerced.get("bbb", "N")
    frame = pd.DataFrame([row], columns=bundle["feats"])
    return np.asarray(bundle["pre"].transform(frame)), frame, row


def _margin_matrix(bundle: dict, Xt: np.ndarray) -> tuple[float, np.ndarray]:
    """(base_value, shap matrix) in margin space for any row count.

    Handles all SHAP output shapes: 2-D (n, f), per-class lists, and 3-D
    (n, f, 2) arrays from newer TreeExplainer binary classifiers.
    """
    sv = bundle["explainer"].shap_values(Xt)
    arr = np.asarray(sv)
    if arr.ndim == 3:  # (n_samples, n_features, n_classes) -> positive class
        arr = arr[:, :, 1]
    elif isinstance(sv, list):
        arr = np.asarray(sv[1])
    mat = np.atleast_2d(arr)
    raw_base = np.asarray(bundle["explainer"].expected_value).ravel()
    base = float(raw_base[1] if raw_base.size > 1 else raw_base[0])
    return base, mat


def _lime_fallback(bundle: dict, Xt: np.ndarray) -> tuple[float, np.ndarray, str]:
    from lime.lime_tabular import LimeTabularExplainer

    names = bundle["names"]
    lx = LimeTabularExplainer(
        bundle["background"],
        feature_names=names,
        class_names=["normal", "stenotic"],
        mode="classification",
        random_state=42,
    )
    exp = lx.explain_instance(Xt[0], bundle["clf"].predict_proba, num_features=len(names))
    sv = np.zeros(len(names))
    for idx, val in exp.local_exp[1]:
        sv[idx] = val
    base = float(exp.intercept[1])
    return base, sv, "lime"


def _jsonable(value: Any) -> Any:
    if hasattr(value, "item"):
        try:
            return value.item()
        except (ValueError, AttributeError):
            pass
    return value


def explain(patient_dict: dict[str, Any], target: str) -> dict[str, Any]:
    """Explain one patient for ``target``.

    Returns {target, probability, base_value, contributions[<=10], method}.
    base_value + contributions are in MARGIN space; probability is calibrated.
    """
    coerced, errors = validate_inputs(patient_dict)
    if errors:
        raise ValueError("; ".join(errors))
    state = ensure_trained()  # 503-style guard: no models, no explanation
    bundle = _get(target)
    Xt, frame, raw_row = _patient_frame(coerced, bundle)
    try:
        base, mat = _margin_matrix(bundle, Xt)
        method = bundle["method"]
    except Exception:
        base, vec, method = _lime_fallback(bundle, Xt)
        mat = vec.reshape(1, -1)
    sv = mat[0]
    # Reported probability comes from the FULL saved model (calibrated when
    # Phase 5 chose calibration); SHAP runs on the unwrapped base estimator.
    # _feature_row builds the raw frame the pipeline expects.
    from app.predict import _feature_row

    proba = float(state["models"][target].predict_proba(_feature_row(coerced, target))[:, 1][0])
    order = np.argsort(-np.abs(sv))[:10]
    contributions = []
    for i in order:
        name = bundle["names"][int(i)]
        val = float(sv[int(i)])
        key = _raw_key(name, bundle["feats"])
        meta = bundle["registry"].get(key, {})
        contributions.append(
            {
                "feature": name,
                "label": _human_label(name, bundle["registry"]),
                "value": _jsonable(raw_row.get(key)),
                "unit": meta.get("unit"),
                "shap_value": round(val, 4),
                "direction": "increases" if val >= 0 else "decreases",
            }
        )
    return {
        "target": target,
        "probability": round(proba, 4),
        "base_value": round(float(base), 4),
        "contributions": contributions,
        "method": method,
    }


def global_importance(target: str, top_n: int = 15) -> pd.DataFrame:
    """mean|SHAP| per transformed feature over the full cleaned frame."""
    bundle = _get(target)
    df, _ = clean()
    Xt = np.asarray(bundle["pre"].transform(df[bundle["feats"]]))
    _, mat = _margin_matrix(bundle, Xt)
    return (
        pd.DataFrame(
            {
                "feature": bundle["names"],
                "label": [_human_label(n, bundle["registry"]) for n in bundle["names"]],
                "mean_abs_shap": np.abs(mat).mean(axis=0),
            }
        )
        .sort_values("mean_abs_shap", ascending=False)
        .head(top_n)
    )
