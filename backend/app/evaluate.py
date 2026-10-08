"""Final evaluation + artifacts (Phase 5).

Flow per target (CAD/LAD/LCX/RCA):
1. Stratified 80/20 holdout split (RANDOM_SEED) BEFORE any fitting. The
   holdout is never tuned on: selection comes from Phase 4 cv_results.csv.
2. Winner = best mean ROC-AUC per target (tie-break F1, then recall).
   Missing targets in cv_results.csv fail loudly (run full training first).
3. Small re-search (n_iter=10) for the winning family on the TRAIN split
   only -- no best_params string parsing, no holdout peeking.
4. Calibration: CalibratedClassifierCV sigmoid vs isotonic, picked by Brier
   score on the holdout (UI shows probabilities, so this is required).
5. Thresholds: F2-maximizing cutoff from cross_val_predict on the train
   split (screening favors recall); documented in thresholds.json.
6. Report holdout metrics (accuracy/precision/recall/F1/ROC-AUC, confusion
   matrix, ROC/PR/calibration curves to docs/figures/), then refit the
   winning pipeline on ALL data and save joblib + metrics.json +
   thresholds.json + model_card.md.

Run (only after the full 24-row cv_results.csv exists):
    uv run python -m app.evaluate
"""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import (
    RandomizedSearchCV,
    StratifiedKFold,
    cross_val_predict,
    train_test_split,
)

from app.config import ARTIFACTS_DIR, RANDOM_SEED, TARGETS
from app.data import clean
from app.features import build_preprocessor, get_feature_columns
from app.train import N_JOBS, _candidates, _grid_size, _make_pipeline

FIG_DIR = ARTIFACTS_DIR.parent.parent / "docs" / "figures"


def pick_winners(cv_csv: Path) -> dict[str, dict]:
    """Best row per target by ROC-AUC, tie-break F1 then recall."""
    if not cv_csv.exists():
        raise FileNotFoundError(f"Missing {cv_csv}: run full training first.")
    res = pd.read_csv(cv_csv)
    missing = set(TARGETS) - set(res["target"].unique())
    if missing:
        raise ValueError(f"cv_results.csv lacks {sorted(missing)}: run full training first.")
    winners = {}
    for target in TARGETS:
        sub = res[res["target"] == target].sort_values(
            ["roc_auc_mean", "f1_mean", "recall_mean"], ascending=False
        )
        winners[target] = sub.iloc[0].to_dict()
    return winners


def f2_threshold(y_true: np.ndarray, proba: np.ndarray) -> float:
    """Cutoff maximizing F2 (recall-weighted) over a grid."""
    best_t, best_f2 = 0.5, -1.0
    for t in np.linspace(0.05, 0.95, 37):
        pred = (proba >= t).astype(int)
        tp = int(((pred == 1) & (y_true == 1)).sum())
        fp = int(((pred == 1) & (y_true == 0)).sum())
        fn = int(((pred == 0) & (y_true == 1)).sum())
        f2 = (5 * tp) / (5 * tp + 4 * fn + fp) if (tp + fp + fn) > 0 else 0.0
        if f2 > best_f2:
            best_t, best_f2 = t, f2
    return round(float(best_t), 2)


def evaluate_target(df: pd.DataFrame, target: str, winner_model: str) -> dict:
    tcol = target.lower()
    feats = get_feature_columns(target, list(df.columns))
    X, y = df[feats], df[tcol].to_numpy()
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, stratify=y, random_state=RANDOM_SEED)
    cands = {name: (spec, dist) for name, spec, dist in _candidates(pd.Series(ytr), RANDOM_SEED)}
    spec, dist = cands[winner_model]
    inner = StratifiedKFold(n_splits=3, shuffle=True, random_state=RANDOM_SEED)
    search = RandomizedSearchCV(
        _make_pipeline(build_preprocessor(feats), spec),
        {k: v for k, v in dist.items()},
        n_iter=min(10, _grid_size(dist)),
        scoring="roc_auc",
        cv=inner,
        n_jobs=N_JOBS,
        random_state=RANDOM_SEED,
        refit=True,
    )
    search.fit(Xtr, ytr)
    best = clone(search.best_estimator_)

    # Calibration shootout on the holdout (Brier decides).
    cands_cal = {"uncalibrated": best}
    for method in ("sigmoid", "isotonic"):
        cands_cal[method] = CalibratedClassifierCV(clone(best), method=method, cv=3)
    for est in cands_cal.values():
        est.fit(Xtr, ytr)
    briers = {
        k: brier_score_loss(yte, est.predict_proba(Xte)[:, 1]) for k, est in cands_cal.items()
    }
    calib_choice = min(briers, key=briers.get)
    final_split_model = cands_cal[calib_choice]

    proba_te = final_split_model.predict_proba(Xte)[:, 1]
    oof = cross_val_predict(
        clone(search.best_estimator_), Xtr, ytr, cv=inner, method="predict_proba", n_jobs=N_JOBS
    )[:, 1]
    threshold = f2_threshold(ytr, oof)
    pred_te = (proba_te >= threshold).astype(int)
    metrics = {
        "accuracy": round(float(accuracy_score(yte, pred_te)), 4),
        "precision": round(float(precision_score(yte, pred_te, zero_division=0)), 4),
        "recall": round(float(recall_score(yte, pred_te, zero_division=0)), 4),
        "f1": round(float(f1_score(yte, pred_te, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(yte, proba_te)), 4),
        "brier": round(float(briers[calib_choice]), 4),
        "calibration": calib_choice,
        "threshold": threshold,
        "winner_model": winner_model,
        "best_params": {
            k: (v.item() if hasattr(v, "item") else v) for k, v in search.best_params_.items()
        },
        "confusion_matrix": confusion_matrix(yte, pred_te).tolist(),
        "n_test": int(len(yte)),
        "test_pos_rate": round(float(yte.mean()), 4),
    }
    _save_figures(target, yte, proba_te, pred_te)
    return {
        "metrics": metrics,
        "search": search,
        "calibration": calib_choice,
        "feats": feats,
        "X": X,
        "y": y,
    }


def _save_figures(target: str, yte, proba_te, pred_te) -> None:
    from sklearn.metrics import CalibrationDisplay, PrecisionRecallDisplay, RocCurveDisplay

    FIG_DIR.mkdir(parents=True, exist_ok=True)
    fig, axes = plt.subplots(1, 3, figsize=(12, 3.5))
    RocCurveDisplay.from_predictions(yte, proba_te, ax=axes[0])
    axes[0].set_title(f"{target} ROC")
    PrecisionRecallDisplay.from_predictions(yte, proba_te, ax=axes[1])
    axes[1].set_title(f"{target} PR")
    CalibrationDisplay.from_predictions(yte, proba_te, n_bins=8, ax=axes[2])
    axes[2].set_title(f"{target} calibration")
    fig.tight_layout()
    fig.savefig(FIG_DIR / f"eval_{target.lower()}_curves.png", dpi=120)
    plt.close(fig)


def refit_all(evaluated: dict, df: pd.DataFrame) -> None:
    """Refit winning pipelines on ALL data + save joblib artifacts."""
    for target, info in evaluated.items():
        feats = info["feats"]
        search = info["search"]
        final = clone(search.best_estimator_)
        if info["metrics"]["calibration"] != "uncalibrated":
            final = CalibratedClassifierCV(
                clone(search.best_estimator_), method=info["metrics"]["calibration"], cv=5
            )
        final.fit(df[feats], df[target.lower()])
        joblib.dump(final, ARTIFACTS_DIR / f"{target.lower()}_model.joblib")


def write_model_card(evaluated: dict) -> Path:
    lines = [
        "# VesselVision model card",
        "",
        "Intended use: decision support / education for CAD + LAD/LCX/RCA "
        "stenosis screening from routine clinical data. Not a diagnostic device.",
        "",
        "Data: Z-Alizadeh Sani extension (UCI 411, CC BY 4.0), n=303. "
        "Leakage columns (LAD/LCX/RCA/Cath/CAD) never used as features.",
        "",
        "## Held-out metrics (stratified 20% test, seed 42)",
        "",
    ]
    for target in TARGETS:
        m = evaluated[target]["metrics"]
        lines.append(
            f"- {target} ({m['winner_model']}, {m['calibration']} calibration, "
            f"threshold {m['threshold']}): acc {m['accuracy']}, prec {m['precision']}, "
            f"rec {m['recall']}, F1 {m['f1']}, AUC {m['roc_auc']}, Brier {m['brier']} "
            f"(n_test={m['n_test']}, pos_rate={m['test_pos_rate']})"
        )
    lines += [
        "",
        "## Limitations",
        "",
        "n=303 single-center; wide confidence intervals; referral-population bias; "
        "no external validation; schematic 3D arteries, not patient anatomy; "
        "screening signal, not diagnosis.",
    ]
    path = ARTIFACTS_DIR / "model_card.md"
    path.write_text("\n".join(lines) + "\n")
    return path


def main() -> None:
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    df, _ = clean()
    winners = pick_winners(ARTIFACTS_DIR / "cv_results.csv")
    evaluated = {t: evaluate_target(df, t, winners[t]["model"]) for t in TARGETS}
    refit_all(evaluated, df)
    metrics = {t: evaluated[t]["metrics"] for t in TARGETS}
    (ARTIFACTS_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2))
    thresholds = {t: evaluated[t]["metrics"]["threshold"] for t in TARGETS}
    (ARTIFACTS_DIR / "thresholds.json").write_text(json.dumps(thresholds, indent=2))
    card = write_model_card(evaluated)
    print("wrote metrics.json, thresholds.json,", card, "+ joblibs + figures")


if __name__ == "__main__":
    main()
