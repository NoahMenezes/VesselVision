# VesselVision — Documentation (DRAFT)

> Status: complete through Phase 6. All numbers below are measured outputs
> of the committed pipeline (seed 42), not targets or estimates.

## 1. Problem and goals

Coronary artery disease (CAD) diagnosis leans on angiography — invasive,
expensive, and late. VesselVision is a decision-support and education web app
for the Multimodal AI Hackathon 2026 (Track A): given routine clinical data
(demographics, symptoms/exam, ECG, labs, echo), it predicts overall CAD status
plus per-artery stenosis (LAD, LCX, RCA), visualizes each artery in 3D colored
by predicted probability, and explains every prediction with SHAP.

Goals: honest predictive performance on a tiny dataset (n=303), an
interactive 3D heart that runs without a dedicated GPU, and a clinical
dashboard a physician can read in under a minute.

## 2. Dataset and preprocessing

- Source: extension of the Z-Alizadeh Sani dataset, UCI ID 411
  (DOI 10.24432/C5461K, CC BY 4.0), vendored in `data/raw/`. 303 patients,
  59 columns, zero missing values. Citation in `data/README.md`.
- Targets: `Cath` (CAD/Normal) is the angiography result and therefore the
  overall CAD label (`CAD = (Cath == CAD)`, 216 CAD / 87 Normal); `LAD`
  (177 stenotic), `LCX` (119), `RCA` (114) are per-artery labels.
- Cleaning (`backend/app/data.py`): normalized column names, fixed the source
  `Sex` typo (`Fmale`), Y/N to 1/0, BBB kept 3-level, VHD ordinal 0-3,
  dropped constant `Exertional CP` (documented). Deterministic: identical
  input bytes give identical `data/processed/clean.csv` (hash-verified).
- Column registry groups features into demographic, symptom/exam, ECG,
  lab/echo, and targets, each with label, unit, and normal range — this
  registry drives the frontend form (`GET /schema`) with no duplicated
  definitions.

### Leakage exclusion (and why)

`Cath`/vessels predict CAD near-perfectly (single-feature AUC: Cath 1.000,
LAD 0.902, LCX 0.775, RCA 0.764; see `docs/figures/eda_*`). They are
diagnosis labels, not inputs. `get_feature_columns()` removes LAD, LCX, RCA,
Cath, and CAD from every feature matrix for every target (case-insensitive,
fail-loud), enforced by `tests/test_leakage.py`. Preprocessing lives inside
sklearn Pipelines, so it fits on training folds only.

## 3. Model architecture and selection

Per target, six arms as `Pipeline(preprocessor, classifier)`: Logistic
Regression (L2), LogReg+SMOTE (in-fold only, comparison), Random Forest
(+SMOTE variant), XGBoost, LightGBM — all small and regularized for n=303,
class imbalance via `class_weight`/`scale_pos_weight`. Full spec in
`backend/app/train.py`. Selection rule: best mean ROC-AUC, tie-break F1/recall.

## 4. CV methodology and results

Stratified repeated 5-fold x 3 (seed 42), `RandomizedSearchCV` on ROC-AUC,
all five metrics (accuracy, precision, recall, F1, ROC-AUC) reported as
mean +/- std. Smoke run (CAD, 2x1) reached AUC ~0.93, consistent with
published results on this dataset.

### Measured comparison (full 24-row `cv_results.csv`, 5x3 CV, seed 42)

| Target | Winner | ROC-AUC | F1 |
| ------ | ------ | ------- | -- |
| CAD | logreg_smote | 0.935 +/- 0.025 | 0.914 |
| LAD | rf_smote | 0.860 +/- 0.048 | 0.831 |
| LCX | xgb | 0.747 +/- 0.069 | 0.594 |
| RCA | lgbm | 0.738 +/- 0.058 | 0.584 |

SMOTE helped the majority-positive targets (CAD, LAD) and not the minority
ones. Vessel intervals are wide: honest consequence of n=303.

## 5. Calibration

CalibratedClassifierCV shootout (sigmoid vs isotonic vs none) picked by Brier
score on the stratified 20% holdout (n=61): CAD sigmoid (Brier 0.117), LAD
sigmoid (0.158), LCX isotonic (0.207), RCA uncalibrated wins (0.193).
Thresholds maximize F1 on train-split out-of-fold predictions (an F2 variant
was tried first and degenerated to 0.05 catch-all cutoffs on vessels, so it
was rejected with the evidence kept in git history): CAD 0.40, LAD 0.45,
LCX 0.20, RCA 0.17. Holdout: CAD acc 0.87/rec 0.98/AUC 0.89; LAD 0.82/0.94/
0.84; LCX 0.62/0.92/0.74; RCA 0.54/0.87/0.75. Curves in `docs/figures/
eval_*_curves.png`. Artifacts: `{target}_model.joblib`, `metrics.json`,
`thresholds.json`, `model_card.md`.

## 5. Calibration

Done — see the measured numbers at the end of section 4 (methods Brier-picked
per target, F1 thresholds, curves in `docs/figures/`). The UI shows
probabilities, so calibration was treated as a requirement, not a bonus.

## 6. SHAP interpretability

Done and live at `POST /explain`. Per-target explainers on the exact
preprocessed features (Tree/Linear dispatch, calibrated wrappers unwrapped,
XGB path-dependent fallback where required), top-10 directional
contributions, global mean-|SHAP| plots in `docs/figures/shap_global_*.png`
(CAD: chest pain/atypical/RWMA; LAD: chest pain/EF/RWMA; LCX: age/TG/chest
pain; RCA: diabetes/age/chest pain). Additivity is test-enforced
(`sigmoid(base + sum) == proba`); LIME fallback implemented and flagged.

## 7. 3D pipeline

- Myocardium: `frontend/public/models/heart.glb` + `CREDITS.md` (source, URL,
  license — must be complete before submission).
- Arteries: separate LAD/LCX/RCA tube meshes along paths in
  `frontend/src/lib/arteries.ts` (single mapping shared by API and UI), since
  whole-heart scans are single fused meshes that cannot be recolored per
  vessel. Colors: green <30%, amber 30-70%, red >70% with animated transitions
  and high-risk pulse; semi-transparent muscle; labels; front/back/reset
  presets; dpr capped [1, 1.5]; no post-processing (no-GPU rule).
- Note: RWMA and other echo inputs are patient-level risk signals, not a
  spatial lesion map — the 3D view colors whole arteries by predicted
  probability, never implies lesion locations.

## 8. System architecture

```
browser (Next.js :3001) --axios--> FastAPI (:8000) --joblib--> 4 calibrated pipelines
   | form (schema-driven)    | /schema /samples (live now)      | SHAP explainers
   | 3D heart (R3F)          | /predict /explain (live post-Phase 5/6)
   | dashboard (recharts)    | /metrics (live post-Phase 5)
```

Stateless API, models load once at startup, request timing header, CORS from
env, uploads parsed in memory (2 MB / 200-row caps), nothing stored or logged.

## 9. Usage

See README Quick start: `uv sync` + `bun install`, `make backend`, `make
frontend`, `make train`, `make test`, `make lint`. Demo path: load an example
patient, watch the heart recolor, click LAD, read SHAP, try a what-if tweak,
print the report.

## 10. Limitations

n=303 single-center dataset with wide confidence intervals; referral-population
bias (angiography candidates); no external validation; not clinically
validated; 3D arteries are schematic paths, not the patient's anatomy; model
outputs are screening signals, not diagnoses.

## 11. Ethics and disclaimer

Public dataset only; no patient data stored or logged; persistent UI banner:
"For decision support and educational purposes only. Not a substitute for
formal diagnostic imaging or clinical judgment." AI assistance disclosed in
README (tools + which parts).

## 12. Future work

External validation cohort, prospective silent-trial logging, uncertainty
shown per prediction, multilingual discharge summaries, realistic-vessel
fitting from the GLB surface, clinician usability study.
