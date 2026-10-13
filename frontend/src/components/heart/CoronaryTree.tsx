"use client";
/** Separate LAD/LCX/RCA tube meshes (the GLB is one fused mesh and cannot be
 *  recolored per artery). Paths come from lib/arteries.ts.
 *
 *  No drei portals here by design: labels live in a DOM overlay positioned
 *  by Projector (see ArteryLabels), because <Html> portals race React 19's
 *  concurrent root management and crash the canvas.
 */
import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  ARTERY_PATHS,
  VESSEL_NEUTRAL,
  arteryLabelAnchor,
  riskColor,
  riskLevel,
} from "@/lib/arteries";
import type { VesselKey } from "@/lib/types";
import { useStore } from "@/store/VesselVisionContext";

const _target = new THREE.Color();
const _neutral = new THREE.Color(VESSEL_NEUTRAL);

/** Eases the orbit target toward the selected vessel's midpoint. */
function FocusRig({ points }: { points: Record<VesselKey, THREE.Vector3> }) {
  const { selected } = useStore();
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3;
    update: () => void;
  } | null;
  useFrame(() => {
    if (!controls) return;
    const goal = selected === "CAD" ? null : points[selected];
    if (goal) {
      controls.target.lerp(goal, 0.08);
      controls.update();
    }
  });
  return null;
}

/** Writes projected screen positions into the DOM overlay chips (no React
 *  state per frame: direct DOM mutation through registered elements). */
export function Projector() {
  const { size, camera } = useThree();
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    for (const a of ARTERY_PATHS) {
      const el = labelEls.get(a.vessel);
      if (!el) continue;
      const anchor = arteryLabelAnchor(a.vessel);
      tmp.set(anchor[0], anchor[1], anchor[2]).project(camera);
      const behind = tmp.z > 1;
      const x = (tmp.x * 0.5 + 0.5) * size.width;
      const y = (-tmp.y * 0.5 + 0.5) * size.height;
      el.style.opacity = behind ? "0" : "1";
      el.style.visibility = "visible";
      el.style.transform = `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
  });
  return null;
}

/** DOM chip registry shared with the overlay (module scope, not state). */
export const labelEls = new Map<VesselKey, HTMLElement>();

function Artery({ vessel, points, radius }: {
  vessel: VesselKey;
  points: [number, number, number][];
  radius: number;
}) {
  const { selected, setSelected, prediction, hoverVessel, setHoverVessel } = useStore();
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const hover = hoverVessel === vessel;
  const prob = prediction?.vessels[vessel]?.probability ?? null;

  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return new THREE.TubeGeometry(curve, 48, radius, 10, false);
  }, [points, radius]);

  // Narrowing anchor: the artery origin stays pinned while risk thins the
  // tube (uniform scale ≈ cross-section; the origin offset hides the rest).
  const origin = useMemo(() => new THREE.Vector3(...points[0]), [points]);

  const active = selected === vessel;

  useFrame(({ clock }) => {
    const m = mat.current;
    if (!m) return;
    _target.copy(prob === null ? _neutral : new THREE.Color(riskColor(prob)));
    m.color.lerp(_target, 0.2);
    const high = prob !== null && riskLevel(prob) === "high";
    m.emissive.set(high ? riskColor(prob) : active || hover ? "#2dd4bf" : "#000000");
    m.emissiveIntensity = high
      ? 0.45 + 0.25 * Math.sin(clock.elapsedTime * 3)
      : active || hover ? 0.6 : 0;
    const meshObj = mesh.current;
    if (meshObj) {
      const goal = prob === null ? 1 : 1 - 0.32 * prob;
      const s = meshObj.scale.x + (goal - meshObj.scale.x) * 0.1;
      meshObj.scale.setScalar(s);
      meshObj.position.set(origin.x * (1 - s), origin.y * (1 - s), origin.z * (1 - s));
    }
  });

  return (
    <mesh
      ref={mesh}
      geometry={geometry}
      onClick={(e) => {
        e.stopPropagation();
        setSelected(active ? "CAD" : vessel);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHoverVessel(vessel);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHoverVessel(null);
        document.body.style.cursor = "auto";
      }}
    >
      <meshStandardMaterial ref={mat} color={VESSEL_NEUTRAL} roughness={0.35} />
    </mesh>
  );
}

export function CoronaryTree() {
  const midpoints = useMemo(() => {
    const out = {} as Record<VesselKey, THREE.Vector3>;
    for (const a of ARTERY_PATHS) {
      out[a.vessel] = new THREE.Vector3(...a.points[Math.floor(a.points.length / 2)]);
    }
    return out;
  }, []);
  return (
    <group>
      <FocusRig points={midpoints} />
      <Projector />
      {ARTERY_PATHS.map((a) => (
        <Artery key={a.vessel} vessel={a.vessel} points={a.points} radius={a.radius} />
      ))}
    </group>
  );
}
