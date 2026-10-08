# Training: COMPLETE (was deferred, finished Oct 8)

Full 24-row `cv_results.csv` (4 targets x 6 arms, 5x3 CV, seed 42,
`N_JOBS=4` run) is committed. Phase 5 evaluation executed on it; see
`backend/artifacts/` and `docs/VesselVision_Documentation.md` sections 4-6.

## Done

- `backend/app/train.py` — 6 arms x N targets, `Pipeline(pre, clf)` inside-fold,
  `RepeatedStratifiedKFold(5 x 3, seed=42)`, `RandomizedSearchCV` on ROC-AUC,
  SMOTE-inside-folds comparison arms. Smoke-tested.
- Smoke result in `backend/artifacts/cv_results.csv`: **CAD only, 6 rows**
  (2 folds x 1 repeat): logreg 0.930, logreg_smote 0.930, rf 0.919,
  rf_smote 0.921, xgb 0.900, lgbm 0.892. Sane, literature-consistent.
- `notebooks/02_training.ipynb` runs on the partial CSV and prints
  `PENDING full-run targets: LAD, LCX, RCA`.

## Pending

Full 4-target comparison (needed before Phase 5 model selection):

```bash
cd backend && uv run python -m app.train
```

- Expected: ~15-40 min CPU, overwrites `cv_results.csv` with 24 rows
  (4 targets x 6 models, mean +/- std of accuracy/precision/recall/F1/ROC-AUC).
- Fast-trial knobs (do NOT use for reported numbers):
  `VV_FOLDS VV_REPEATS CV_N_ITER VV_TARGETS` (e.g. `VV_TARGETS=CAD`).
- Then re-execute:
  `PYTHONPATH=$PWD uv run jupyter nbconvert --to notebook --execute ../notebooks/02_training.ipynb`
- Reproducibility: seed 42 in CV + search + every estimator. The double-run
  hash check was deferred with the run itself; do it then if judges ask.
- Selection rule (Phase 5): best mean ROC-AUC per target, tie-break F1/recall.
  No winner is picked from smoke numbers.

## Why deferred

Long CPU run; everything downstream of model weights (Phases 8-11 frontend)
proceeds on mock predictions + the shared API contract meanwhile.
