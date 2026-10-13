# Devpost draft — VesselVision

## Elevator pitch

Type in routine clinical data, watch each coronary artery recolor by
stenosis risk on an interactive 3D heart, and read exactly why in SHAP.

## Inspiration

Angiography answers CAD late and invasively. The Z-Alizadeh Sani data shows
routine workup already separates CAD from normal — we built the interface
that makes that signal usable at a glance.

## What it does

Predicts overall CAD plus LAD/LCX/RCA stenosis from 54 clinical features;
renders risk on a 3D heart with per-vessel selection; explains with SHAP top
contributors, measurements-vs-normal table, and what-if previews.

## How we built it

FastAPI + scikit-learn/XGBoost/LightGBM with strict leakage guards
(Cath/vessels never features, preprocessing inside folds), calibrated
probabilities, SHAP; Next.js + React Three Fiber + Recharts frontend driven
entirely by a backend schema registry.

## Challenges

n=303 with honest wide intervals; single fused heart meshes that cannot be
recolored per artery (solved with separate mapped tube meshes); keeping every
screen number traceable to measured artifacts.

## Accomplishments

End-to-end prediction-to-3D-to-explanation loop with leakage tests,
deterministic pipeline, and a dashboard that degrades honestly without models.

## What we learned

Small clinical data punishes leakage hardest: Cath alone predicts CAD at AUC
1.0, so architecture-level guards beat vigilance.

## What's next

Per-prediction uncertainty, docs screenshots, demo video, lab-photo auto-fill,
per-artery what-if. Full list in `docs/ROADMAP.md`.

Built With: fastapi, scikit-learn, xgboost, lightgbm, shap, nextjs,
react-three-fiber, recharts, tailwind.
