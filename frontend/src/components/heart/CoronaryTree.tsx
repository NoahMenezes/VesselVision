"use client";
/** Separate LAD/LCX/RCA tube meshes (the GLB is one fused mesh and cannot be
 *  recolored per artery). Paths come from lib/arteries.ts; probability-driven
 *  colors + pulse land in Phase 11 — neutral color until then.
 */
import { useMemo, useState } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { ANATOMY_MAP, ARTERY_PATHS, VESSEL_NEUTRAL } from "@/lib/arteries";
import type { VesselKey } from "@/lib/types";
import { useStore } from "@/store/VesselVisionContext";

function Artery({ vessel, points, radius, labelOffset }: {
  vessel: VesselKey;
  points: [number, number, number][];
  radius: number;
  labelOffset: [number, number, number];
}) {
  const { selected, setSelected } = useStore();
  const [hover, setHover] = useState(false);
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return new THREE.TubeGeometry(curve, 48, radius, 10, false);
  }, [points, radius]);
  const active = selected === vessel;
  const mid = points[Math.floor(points.length / 2)];
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
        {/* Neutral color now; Phase 11 binds riskColor(probability) + pulse. */}
        <meshStandardMaterial
          color={VESSEL_NEUTRAL}
          emissive={active || hover ? "#2dd4bf" : "#000000"}
          emissiveIntensity={active || hover ? 0.6 : 0}
          roughness={0.35}
        />
      </mesh>
      <Html position={[mid[0] + labelOffset[0], mid[1] + labelOffset[1], mid[2] + labelOffset[2]]} center>
        <button
          type="button"
          aria-label={`Select ${ANATOMY_MAP[vessel]}`}
          onClick={() => setSelected(vessel)}
          className="rounded-full border border-border bg-surface/90 px-2 py-0.5 text-[11px] font-medium"
        >
          {vessel}
        </button>
      </Html>
    </group>
  );
}

export function CoronaryTree() {
  return (
    <group>
      {ARTERY_PATHS.map((a) => (
        <Artery key={a.vessel} {...a} />
      ))}
    </group>
  );
}
