# VesselVision

Cardiovascular risk visualization & prediction (Multimodal AI Hackathon 2026, Track A).
Enter a patient's clinical data, get CAD + LAD/LCX/RCA stenosis predictions, explore
them on an interactive 3D heart with a SHAP-backed clinical dashboard.

## Overview

- Tabular model (Z-Alizadeh Sani extension, n=303) predicts overall CAD status plus
  per-artery stenosis (LAD, LCX, RCA).
- FastAPI backend serves predictions + SHAP explanations; Next.js frontend renders
  the 3D heart and dashboard.
- Target leakage is blocked by design: LAD, LCX, RCA, Cath are never input features
  for any target, and no vessel label predicts another.

## Features

- Schema-driven patient form (GET /schema) with units + normal-range hints.
- Example patients, CSV upload with validation, debounced live predict.
- 3D heart (open-license GLB myocardium + separate LAD/LCX/RCA meshes) colored
  green -> amber -> red by predicted probability; click/hover/keyboard selection.
- SHAP top-10 diverging bar chart per selected target, physiological table,
  model-performance tab, PDF/print report, what-if slider mode.

## Architecture

```
vesselvision/
  backend/          FastAPI (uv, Python 3.12): main.py + app/ modules
  backend/artifacts/  trained {cad,lad,lcx,rca}_model.joblib + metrics.json
  frontend/         Next.js App Router + TS + Tailwind (bun), R3F 3D heart
  data/             raw dataset (public) + processed/clean + feature_schema.json
  notebooks/        01_eda.ipynb, 02_training.ipynb
  docs/             6-page doc + figures/
```

Model outputs for LAD/LCX/RCA map 1:1 to the displayed arteries via a single
`ANATOMY_MAP` shared by API and frontend.

## Setup (uv + bun)

```bash
# backend (from backend/)
uv sync
cp .env.example .env   # adjust FRONTEND_URL if needed

# frontend (from frontend/)
bun install
cp .env.example .env.local  # adjust NEXT_PUBLIC_API_URL if needed
```

Requires Python 3.12 (`uv` handles it), Node 22 + `bun 1.4`.

## Run

```bash
make backend   # uv run uvicorn main:app --port 8000 (from backend/)
make frontend  # bun run dev (from frontend/) -> http://localhost:3000
make train     # full retrain -> artifacts + metrics + figures (Phase 4-5)
make test      # backend pytest + frontend typecheck/lint
```

One-command alternative (from `frontend/`): `bun run dev` boots the API
(:8000) and the web app together; `bun run dev:web` / `bun run dev:api` run
one side only.

Full training (~1h, run detached): `cd backend && N_JOBS=4 nohup uv run
python -m app.train > /tmp/train_full.log 2>&1 &`. Done = 25 lines in
`backend/artifacts/cv_results.csv`. `N_JOBS` caps worker processes (default
4); unbounded parallelism thrashed a 12-core box to load 140+.

Or see `Makefile` for the exact one-liners. Health: `GET http://localhost:8000/health`.

## Deployment

- Frontend: Vercel, with **Root Directory = `frontend`**. Set env vars in the
  Vercel dashboard (never in files): `NEXT_PUBLIC_API_URL` (backend origin),
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (production Clerk
  keys, not test keys). `frontend/vercel.json` pins install/build commands;
  `next build` passes with zero env vars (auth UI degrades to setup guidance).
- Backend: Render / Hugging Face Spaces via `backend/Dockerfile`
  (`docker build -f backend/Dockerfile -t vesselvision-backend ./backend`), mounting
  `data/` and `backend/artifacts/` and setting `FRONTEND_URL` to the deployed
  frontend origin for CORS. On SELinux hosts (Fedora/RHEL) add `:z` to both
  `-v` mounts. Expect cold starts on free tiers; the UI shows a
  clear "backend offline" state until the API answers.
- Reproducible installs: `backend/requirements.txt` (`uv export --no-hashes`).
- Privacy: uploads are parsed in memory (2 MB cap, 200-row cap), never stored
  or logged. Use only the public dataset or synthetic data.

## Dataset

- Extension of the Z-Alizadeh Sani dataset (UCI / Kaggle), 303 patients, tabular.
- Targets: CAD, LAD, LCX, RCA (binary). Columns are inspected, not assumed;
  see `notebooks/01_eda.ipynb` and `data/feature_schema.json`.
- Public dataset only. Place the raw file under `data/` (see `data/README.md`
  once Phase 2 lands).

## Models

- Per target: Logistic Regression (L2), Random Forest, XGBoost, LightGBM compared
  with stratified repeated K-fold CV (5 x 3, fixed seed); imbalance via
  class_weight / scale_pos_weight (SMOTE only inside folds for comparison).
- Best per target by CV ROC-AUC (tie-break F1/recall), calibrated
  (CalibratedClassifierCV) since the UI shows probabilities.
- Full tables in `notebooks/02_training.ipynb`, `backend/artifacts/cv_results.csv`.

## Evaluation

- Held-out stratified 20% test set: accuracy, precision, recall, F1, ROC-AUC,
  confusion matrix, ROC/PR + calibration curves, Brier score (see `docs/figures/`).
- Honest note: n=303 means wide confidence intervals; metrics are reported as
  mean +/- std across folds. Never tuned on the test fold.

## 3D assets and credits

- Heart muscle: open-license `.glb` in `frontend/public/models/` (under 5 MB).
  See `frontend/public/models/CREDITS.md` for author, source URL, license.
- LAD/LCX/RCA are separate meshes (TubeGeometry along paths in one
  `arteries.ts` config) so predicted probabilities map exactly to colors.
- Only public datasets and open-licensed 3D assets are used.

## Screenshots

> TODO (browser captures before submission):
> `docs/screenshots/01-form.png` (filled form), `02-heart.png` (recolored
> arteries), `03-shap.png` (explanation panel), `04-mobile.png` (guided tabs).

## Built With

FastAPI, scikit-learn, XGBoost, LightGBM, imbalanced-learn, SHAP, LIME,
pandas, Next.js (App Router, TypeScript), React Three Fiber, drei, Recharts,
Tailwind CSS, papaparse, axios, uv, bun.

## AI-assisted parts

| Tool | Used for |
| ---- | -------- |
| OpenCode (Muse Spark) | Scaffolding, training pipeline, API, frontend, docs drafts |
| Taste skills (`Leonxlnx/taste-skill`) | Frontend design rules (deep dark console direction, anti-slop bans) |
| ChatGPT / similar (if used) | Copy review, demo script polish |

All model metrics are real outputs of the training code; no results fabricated.

## Disclaimer

For decision support and educational purposes only. Not a substitute for formal
diagnostic imaging or clinical judgment. Always visible in the UI.

## License

TBD (e.g. MIT for code; dataset and 3D assets keep their own licenses, credited above).
