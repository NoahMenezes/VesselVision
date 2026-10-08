# 3D heart model

## Current file

`heart.glb` (3.07 MB, single mesh, ~20k verts, no animations) — Sketchfab
user download ("human heart with annotations" variant).
**PRE-SUBMISSION FIX REQUIRED: author name, model URL, and exact license
(CC-BY / CC0 / other) must be confirmed from the Sketchfab page and written
here. If the license is stricter than CC-BY, replace the file before 15 Oct.**
Previous placeholder (CC0 Quaternius, 14 KB) remains in git history.

## Wanted upgrade (optional, drop-in)

A realistic anatomical mesh makes the viz stronger and swaps in with zero
code changes (same path, same scale handling). In a browser:

1. NIH 3D "Heart, Male" (public domain): open
   <https://3d.nih.gov/entries/3DPX-021000>, Download, choose the
   **VH_M_Heart.glb** input mesh, save here as `heart.glb`. (Direct server
   download is blocked by signed URLs; interactive browser download works.)
2. Or Sketchfab "Anatomically Correct Human Heart" (free account, check the
   author's CC license, usually CC-BY) and credit author + URL + license here.

## Why a separate mesh per artery still exists

Whole-heart scans ship as ONE fused mesh, so LAD/LCX/RCA cannot be recolored
from the GLB alone. The GLB is the myocardium (rendered semi-transparent);
the three arteries are separate tube meshes defined in
`frontend/src/lib/arteries.ts` (adjustable paths, exact model-output mapping).
