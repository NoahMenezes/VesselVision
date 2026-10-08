# 3D heart model

## Wanted file

`heart.glb` in this directory (Git-ignored if over 5 MB? No: it IS committed,
it must stay under ~5 MB).

## Source (do this in a browser; direct server download is blocked)

1. Open <https://3d.nih.gov/entries/3DPX-021000> ("Heart, Male", NIH 3D).
2. Press Download, choose the **VH_M_Heart.glb** input mesh.
3. Save it here as `heart.glb`.

Alternatives (same terms): "17 yo Female, Normal Heart"
<https://3d.nih.gov/entries/3DPX-002636> (Matthew Bramlet).

## License and credit

NIH 3D models are U.S. public domain. Cite in docs and README:

- VH_M_Heart, NIH 3D (3DPX-021000), public domain.
  <https://3d.nih.gov/entries/3DPX-021000>

## Why a separate mesh per artery still exists

Whole-heart scans ship as ONE fused mesh, so LAD/LCX/RCA cannot be recolored
from the GLB alone. The GLB is the myocardium (rendered semi-transparent);
the three arteries are separate tube meshes defined in
`frontend/src/lib/arteries.ts` (adjustable paths, exact model-output mapping).
