"use client";
/** Separate LAD/LCX/RCA tube meshes (the GLB is one fused mesh and cannot be
 *  recolored per artery). Paths come from lib/arteries.ts.
 *
 *  Phase 11 behavior: color lerps toward riskColor(probability) from the
 *  store; with no prediction yet every artery stays neutral (never fake
 *  numbers). High-risk vessels pulse gently. Hover shows name + probability
 *  + level; click selects and the camera rig focuses the vessel.
 */
import { useMemo, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  ANATOMY_MAP,
  ARTERY_PATHS,
  VESSEL_NEUTRAL,
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

function Artery({ vessel, points, radius, labelOffset }: {
  vessel: VesselKey;
  points: [number, number, number][];
  radius: number;
  labelOffset: [number, number, number];
}) {
  const { selected, setSelected, prediction } = useStore();
  const [hover, setHover] = useState(false);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const prob = prediction?.vessels[vessel]?.probability ?? null;

  const { geometry, mid } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return {
      geometry: new THREE.TubeGeometry(curve, 48, radius, 10, false),
      mid: new THREE.Vector3(...points[Math.floor(points.length / 2)]),
    };
  }, [points, radius]);

  const active = selected === vessel;

  useFrame(({ clock }) => {
    const m = mat.current;
    if (!m) return;
    _target.copy(prob === null ? _neutral : new THREE.Color(riskColor(prob)));
    m.color.lerp(_target, 0.12);
    // Gentle pulse on high-risk vessels only; neutral otherwise.
    const high = prob !== null && riskLevel(prob) === "high";
    m.emissive.set(high ? riskColor(prob) : active || hover ? "#2dd4bf" : "#000000");
    m.emissiveIntensity = high
      ? 0.45 + 0.25 * Math.sin(clock.elapsedTime * 3)
      : active || hover ? 0.6 : 0;
  });

  return (
    <group>
      <mesh
        geometry={geometry}
        onClick={(e) => {
          e.stopPropagation();
          setSelected(active ? "CAD" : vessel);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "auto";
        }}
      >
        <meshStandardMaterial ref={mat} color={VESSEL_NEUTRAL} roughness={0.35} />
      </mesh>
      <Html position={[mid.x + labelOffset[0], mid.y + labelOffset[1], mid.z + labelOffset[2]]} center>
        <div className="flex flex-col items-center">
          <button
            type="button"
            aria-label={`Select ${ANATOMY_MAP[vessel]}`}
            aria-pressed={active}
            onClick={() => setSelected(vessel)}
            className="rounded-full border border-border bg-surface/90 px-2 py-0.5 text-[11px] font-medium"
          >
            {vessel}
          </button>
          {hover && (
            <div className="tnum mt-1 whitespace-nowrap rounded-lg border border-border bg-surface px-2 py-1 text-[11px]">
              {ANATOMY_MAP[vessel]}:{" "}
              {prob === null ? "awaiting prediction" : `${Math.round(prob * 100)}% (${riskLevel(prob)} risk)`}
            </div>
          )}
        </div>
      </Html>
    </group>
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
      {ARTERY_PATHS.map((a) => (
        <Artery key={a.vessel} {...a} />
      ))}
    </group>
  );
}
