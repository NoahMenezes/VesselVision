# 3D heart model

## Current file

`heart.glb` (14 KB, single mesh `Heart_Full`) — "Heart" by **Quaternius**,
via poly.pizza (`/m/1yCRUwFnwX`), **CC0 public domain** (no attribution
required; credited here anyway). Stylized low-poly myocardium shell; the
LAD/LCX/RCA arteries are separate tube meshes (see `src/lib/arteries.ts`).

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
