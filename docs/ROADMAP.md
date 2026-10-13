# VesselVision — Roadmap (do later)

Prioritized remainder from the Track A brief + judging weights. Checked items
are built; unchecked items are future work. Nothing here blocks the demo.

## High value (moves the score)

- [x] **Uncertainty on every prediction** — `GET /uncertainty` serves ± bands
  from the CV folds in `backend/artifacts/cv_results.csv`; shown in the
  results section, the theatre readout, and the printed report.
- [ ] **Docs screenshots** — capture the four README placeholders:
  `docs/screenshots/01-form.png`, `02-heart.png`, `03-shap.png`, `04-mobile.png`.
- [ ] **Demo video (5–7 min)** — follow `docs/demo_script.md` shot list; every
  on-screen number must come from `cv_results.csv` / `metrics.json`.

## Medium value (completeness)

- [ ] **Lab-report photo auto-fill** — optional in the brief. Upload a lab photo,
  OCR key values (cholesterol, glucose, …) into the form. Never store uploads.
- [ ] **Report upgrades** — one-click PDF download button; patient name/ID
  header field. (Print/save-via-browser works today.)
- [ ] **Per-artery what-if deltas** — what-if currently previews CAD only;
  extend the preview to LAD/LCX/RCA so tweaks visibly move the 3D heart.
- [x] **Prediction history (Neon Postgres)** — `GET/POST/DELETE /history`
  store checkups in Neon; the API stays fully usable with it off (503 +
  guidance). History dashboard with CAD trend chart, reload, and delete.

## Out of scope for the hackathon

- [ ] External validation cohort (single-center data; disclosed as limitation).
- [ ] Accounts/history, clinician usability study.

## Built (do not regress)

- [x] CAD + LAD/LCX/RCA prediction with leakage guards
- [x] Interactive 3D heart (colors, narrowing, beat, flow, theatre view)
- [x] SHAP reasons, measurements, what-if (CAD), performance tab
- [x] Form + examples + CSV upload (template + sample file)
- [x] Printable patient report, dark/light mode, mobile stacked flow
- [x] Report in English / Hindi / Spanish (print follows the selection)
