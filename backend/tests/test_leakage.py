"""Leakage guard: no target column may ever appear in a feature matrix.

Fails if LAD, LCX, RCA, Cath, or CAD leak into the features for ANY target,
including via the fitted preprocessor's output names.
"""

from app.config import TARGETS
from app.data import clean
from app.features import build_preprocessor, get_feature_columns

FORBIDDEN = {"lad", "lcx", "rca", "cath", "cad"}


def test_no_leakage_columns_per_target():
    df, _ = clean()
    all_columns = list(df.columns)
    assert FORBIDDEN <= set(all_columns), "expected target columns missing from clean frame"
    for target in TARGETS:
        feats = get_feature_columns(target, all_columns)
        assert not (FORBIDDEN & set(feats)), f"leakage in features for {target}"
        assert len(feats) == 54, f"expected 54 features for {target}, got {len(feats)}"


def test_preprocessor_output_has_no_leakage():
    df, _ = clean()
    feats = get_feature_columns("CAD", list(df.columns))
    pre = build_preprocessor(feats)
    X = pre.fit_transform(df[feats])
    names = list(pre.get_feature_names_out())
    assert not any(n.lower() in FORBIDDEN for n in names), f"leakage in output names: {names}"
    # 52 scaled numerics + 3 bbb dummies + 1 ordinal vhd
    assert X.shape == (len(df), 56), f"unexpected matrix shape {X.shape}"


def test_unknown_target_raises():
    import pytest

    with pytest.raises(ValueError):
        get_feature_columns("NOPE", ["age"])
