"""Model comparison for 4 targets (Phase 4).

Per target (CAD/LAD/LCX/RCA) compares 6 arms, all as
``Pipeline(preprocessor, clf)`` so preprocessing is fit inside each fold
(no preprocessing leakage; features from Phase 3, targets never included):

- logreg        Logistic Regression (L2, class_weight balanced)
- logreg_smote  logreg + SMOTE inside the pipeline folds (comparison only)
- rf            Random Forest (regularized, class_weight balanced)
- rf_smote      rf + SMOTE inside the pipeline folds (comparison only)
- xgb           XGBoost (scale_pos_weight = neg/pos, shallow)
- lgbm          LightGBM (scale_pos_weight, high min_child_samples)

CV: RepeatedStratifiedKFold(5 x 3, seed=42). RandomizedSearchCV (n_iter from
CV_N_ITER, default 15) over small distributions; selection by mean ROC-AUC.
SMOKE-TEST overrides via env: VV_FOLDS, VV_REPEATS, VV_N_ITER, VV_TARGETS.

Method note (honest limitation): search and reporting share the same
repeated-CV loop, so the means below are model-SELECTION scores, not
unbiased estimates. The unbiased estimate comes from the Phase 5 holdout,
which is split BEFORE any Phase 5 refit and never used for tuning.

Run:  uv run python -m app.train
"""

from __future__ import annotations

import os
from pathlib import Path

import numpy as np
import pandas as pd
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline
from lightgbm import LGBMClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import RandomizedSearchCV, RepeatedStratifiedKFold
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier

from app.config import ARTIFACTS_DIR, RANDOM_SEED, TARGETS
from app.data import clean
from app.features import build_preprocessor, get_feature_columns

METRICS = ["accuracy", "precision", "recall", "f1", "roc_auc"]


def _candidates(y: pd.Series, seed: int) -> list[tuple[str, object, dict]]:
    pos = int(y.sum())
    neg = len(y) - pos
    spw = neg / max(pos, 1)
    logreg = LogisticRegression(max_iter=2000, class_weight="balanced", random_state=seed)
    rf = RandomForestClassifier(class_weight="balanced", random_state=seed, n_jobs=-1)
    xgb = XGBClassifier(scale_pos_weight=spw, random_state=seed, n_jobs=-1,
                        eval_metric="logloss")
    lgbm = LGBMClassifier(scale_pos_weight=spw, random_state=seed, n_jobs=-1, verbose=-1)
    smote = SMOTE(random_state=seed)
    return [
        ("logreg", logreg, {"clf__C": np.logspace(-2, 1, 20)}),
        ("logreg_smote", (logreg, smote), {"clf__C": np.logspace(-2, 1, 20)}),
        ("rf", rf, {"clf__n_estimators": [200, 300, 400],
                    "clf__max_depth": [3, 4, 5, 6],
                    "clf__min_samples_leaf": [1, 2, 4]}),
        ("rf_smote", (rf, smote), {"clf__n_estimators": [200, 300],
                                   "clf__max_depth": [3, 4, 5],
                                   "clf__min_samples_leaf": [1, 2, 4]}),
        ("xgb", xgb, {"clf__n_estimators": [200, 300],
                      "clf__max_depth": [2, 3, 4],
                      "clf__learning_rate": [0.03, 0.06, 0.1, 0.15],
                      "clf__subsample": [0.7, 0.85, 1.0],
                      "clf__colsample_bytree": [0.7, 0.85, 1.0]}),
        ("lgbm", lgbm, {"clf__n_estimators": [200, 300],
                        "clf__max_depth": [2, 3, 4, -1],
                        "clf__learning_rate": [0.03, 0.06, 0.1],
                        "clf__min_child_samples": [10, 20, 30]}),
    ]


def _make_pipeline(pre, spec) -> Pipeline | ImbPipeline:
    if isinstance(spec, tuple):
        clf, sampler = spec
        return ImbPipeline([("pre", pre), ("smote", sampler), ("clf", clf)])
    return Pipeline([("pre", pre), ("clf", spec)])


def run_target(df: pd.DataFrame, target: str, folds: int, repeats: int,
               n_iter: int, seed: int) -> pd.DataFrame:
    tcol = target.lower()
    feats = get_feature_columns(target, list(df.columns))
    X, y = df[feats], df[tcol]
    pre = build_preprocessor(feats)
    cv = RepeatedStratifiedKFold(n_splits=folds, n_repeats=repeats, random_state=seed)
    rows: list[dict] = []
    for name, spec, dist in _candidates(y, seed):
        pipe = _make_pipeline(pre, spec)
        search = RandomizedSearchCV(pipe, dist, n_iter=min(n_iter, _grid_size(dist)),
                                    scoring="roc_auc", cv=cv, n_jobs=-1,
                                    random_state=seed, refit=True)
        search.fit(X, y)
        # Re-score best estimator across the same CV for all 5 metrics.
        from sklearn.base import clone
        from sklearn.model_selection import cross_validate
        best_pipe = clone(search.best_estimator_)
        scores = cross_validate(best_pipe, X, y, cv=cv, scoring=METRICS, n_jobs=-1)
        row = {"target": target, "model": name,
               "best_params": str(search.best_params_)}
        for m in METRICS:
            vals = scores[f"test_{m}"]
            row[f"{m}_mean"] = round(float(vals.mean()), 4)
            row[f"{m}_std"] = round(float(vals.std()), 4)
        rows.append(row)
        print(f"[{target}/{name}] auc={row['roc_auc_mean']}+/-{row['roc_auc_std']} "
              f"f1={row['f1_mean']}+/-{row['f1_std']}", flush=True)
    return pd.DataFrame(rows)


def _grid_size(dist: dict) -> int:
    n = 1
    for v in dist.values():
        n *= len(v)
    return n


def main() -> Path:
    folds = int(os.getenv("VV_FOLDS", "5"))
    repeats = int(os.getenv("VV_REPEATS", "3"))
    n_iter = int(os.getenv("CV_N_ITER", "15"))
    only = os.getenv("VV_TARGETS", ",".join(TARGETS)).split(",")
    df, _ = clean()
    out = ARTIFACTS_DIR / "cv_results.csv"
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    frames = [run_target(df, t.strip(), folds, repeats, n_iter, RANDOM_SEED)
              for t in only if t.strip() in TARGETS]
    pd.concat(frames, ignore_index=True).to_csv(out, index=False)
    print("wrote", out)
    return out


if __name__ == "__main__":
    main()
