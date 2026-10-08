# Demo video script (5-7 minutes)

Target: unlisted YouTube, English audio or subtitles. Record at 1080p,
browser zoom 110%, backend + frontend running locally.

## Shot list (have open: terminal, /docs, app at :3001, notebook 02)

| Time | Section | Say | Show |
| ---- | ------- | --- | ---- |
| 0:00-0:30 | Problem | Angiography is invasive and late; routine clinical data already holds CAD signal. VesselVision turns it into per-artery risk you can see. | App hero: disclaimer + empty dashboard |
| 0:30-1:15 | Data + leakage | UCI-411 extension, 303 patients, 59 columns. Cath and the vessels predict CAD near-perfectly, so they are never features. Show the leakage table. | `01_eda.ipynb` + `docs/figures/eda_class_balance.png` |
| 1:15-2:15 | Models + metrics | 6 arms x 4 targets, stratified 5x3 CV, seed 42. Read the ROC-AUC table honestly, including wide std on vessels. | `02_training.ipynb` comparison + `cv_results.csv` |
| 2:15-4:45 | Live demo | Load example patient: heart recolors. Click LAD: SHAP explains. Tweak cholesterol in what-if: delta moves. Upload a CSV row. Print the report. | Full app flow, guided tabs on mobile width once |
| 4:45-5:45 | Architecture + code | Registry-driven schema, one ANATOMY_MAP, 503-until-trained API, tests incl. leakage guard. | `app/` tree, `test_leakage.py`, `/docs` |
| 5:45-6:15 | Limitations + next | n=303 single-center, no external validation, schematic arteries. Next: validation cohort, uncertainty display. | `VesselVision_Documentation.md` limitations |

## Rules

No fabricated numbers on screen: every metric visible must come from
`cv_results.csv` / `metrics.json`. State the disclaimer slide verbatim.
