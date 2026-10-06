"""Feature pipeline (Phase 3).

- get_feature_columns(target): same 54 leakage-free columns for every target.
  LAD, LCX, RCA, Cath (and the derived CAD label) are NEVER features,
  matched case-insensitively so future column renames cannot leak.
- build_preprocessor(): median/most-frequent imputation (guards: the raw
  file has zero missing, but the API will accept sparse inputs in Phase 7),
  StandardScaler for numerics, one-hot for BBB.
- No engineered features, deliberately: BMI already exists in the source
  data and there is no diastolic BP to derive pulse pressure from.
  Adding weak proxies on n=303 would cost degrees of freedom for no
  clinical meaning.

The preprocessor is designed to sit INSIDE an sklearn Pipeline so it is
fit only on training folds (no preprocessing leakage) in Phase 4.
"""

from __future__ import annotations

from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from app.config import LEAKAGE_COLUMNS, TARGETS

# Extra target-derived column that must never be a feature either.
DERIVED_TARGETS = ["CAD"]


def _is_leakage(column: str) -> bool:
    lowered = column.lower()
    tokens = [t.lower() for t in LEAKAGE_COLUMNS + DERIVED_TARGETS]
    return any(tok in lowered for tok in tokens)


def get_feature_columns(target: str, all_columns: list[str] | None = None) -> list[str]:
    """Leakage-free feature columns for ``target``.

    ``all_columns`` defaults to the cleaned frame's columns (54 features +
    5 target columns). Every target gets the same 54 features.
    """
    if target not in TARGETS:
        raise ValueError(f"Unknown target {target!r}; expected one of {TARGETS}")
    if all_columns is None:
        from app.data import clean  # local import: keeps module import light

        df, _registry = clean()
        all_columns = list(df.columns)
    features = [c for c in all_columns if not _is_leakage(c)]
    leaked = [c for c in all_columns if _is_leakage(c)]
    if not leaked:  # schema changed? fail loudly instead of training on targets
        raise ValueError("No leakage columns found in input; refusing to guess")
    return features


# bbb is the only non-numeric feature (N/LBBB/RBBB strings).
CATEGORICAL_COLUMNS = ["bbb"]
# vhd is already ordinal (0-3) from clean(): impute, do not scale.
ORDINAL_COLUMNS = ["vhd"]


def build_preprocessor(feature_columns: list[str]) -> ColumnTransformer:
    """ColumnTransformer over exactly ``feature_columns``."""
    numeric = [c for c in feature_columns if c not in CATEGORICAL_COLUMNS + ORDINAL_COLUMNS]
    categorical = [c for c in feature_columns if c in CATEGORICAL_COLUMNS]
    ordinal = [c for c in feature_columns if c in ORDINAL_COLUMNS]
    return ColumnTransformer(
        transformers=[
            ("num", Pipeline([
                ("impute", SimpleImputer(strategy="median")),
                ("scale", StandardScaler()),
            ]), numeric),
            ("cat", Pipeline([
                ("impute", SimpleImputer(strategy="most_frequent")),
                ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
            ]), categorical),
            ("ord", SimpleImputer(strategy="median"), ordinal),
        ],
        verbose_feature_names_out=False,
    )


def numeric_feature_count(feature_columns: list[str]) -> int:
    return len([c for c in feature_columns if c not in CATEGORICAL_COLUMNS + ORDINAL_COLUMNS])
