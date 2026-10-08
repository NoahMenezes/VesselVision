/** Coronary anatomy config (Phase 10a). Single source of truth mapping
 *  model outputs (LAD/LCX/RCA) to displayed arteries.
 *
 *  The GLB myocardium is one fused mesh, so arteries are separate tube
 *  meshes following these paths over the heart surface. All coordinates are
 *  in scene units (heart ~2 units tall, apex down -Y). Adjust points here;
 *  nothing else needs to change.
 */
import type { VesselKey } from "@/lib/types";

/** Myocardium mesh URL. Kept here (not in Myocardium.tsx) so non-3D modules
 *  can reference it without importing three.js (bun test cannot require it). */
export const HEART_MODEL_URL = "/models/heart.glb";

export const ANATOMY_MAP: Record<VesselKey, string> = {
  LAD: "Left anterior descending",
  LCX: "Left circumflex",
  RCA: "Right coronary artery",
};

export interface ArteryPath {
  vessel: VesselKey;
  /** Control points from base (top) to apex/diagonal territory. */
  points: [number, number, number][];
  radius: number;
  labelOffset: [number, number, number];
}

/** Stylized but anatomically placed: LAD down the anterior septum,
 *  LCX wrapping left, RCA down the right atrioventricular groove. */
export const ARTERY_PATHS: ArteryPath[] = [
  {
    vessel: "LAD",
    points: [
      [0.0, 0.75, 0.42],
      [-0.06, 0.45, 0.52],
      [-0.1, 0.1, 0.55],
      [-0.12, -0.3, 0.5],
      [-0.1, -0.62, 0.38],
    ],
    radius: 0.045,
    labelOffset: [-0.3, 0.0, 0.2],
  },
  {
    vessel: "LCX",
    points: [
      [0.0, 0.75, 0.42],
      [0.35, 0.62, 0.35],
      [0.55, 0.4, 0.15],
      [0.6, 0.1, -0.1],
      [0.5, -0.1, -0.3],
    ],
    radius: 0.04,
    labelOffset: [0.35, 0.15, 0.0],
  },
  {
    vessel: "RCA",
    points: [
      [0.0, 0.75, 0.42],
      [-0.35, 0.62, 0.35],
      [-0.55, 0.4, 0.2],
      [-0.58, 0.05, 0.05],
      [-0.45, -0.35, 0.05],
    ],
    radius: 0.04,
    labelOffset: [-0.35, 0.1, 0.1],
  },
];

/** Neutral vessel color before any prediction (teal-gray, not risk colors). */
export const VESSEL_NEUTRAL = "#5b8a8a";

/** Risk color scale (Phase 11 drives these from probabilities). */
export function riskColor(probability: number): string {
  if (probability >= 0.7) return "#ef4444";
  if (probability >= 0.3) return "#f59e0b";
  return "#22c55e";
}

export function riskLevel(probability: number): "low" | "moderate" | "high" {
  if (probability >= 0.7) return "high";
  if (probability >= 0.3) return "moderate";
  return "low";
}
