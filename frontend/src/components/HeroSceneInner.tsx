"use client";
/** Non-interactive hero scene: myocardium + neutral coronary tubes, slow
 *  spin, soft studio lighting. No controls, no portals, no store writes.
 */
import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { ARTERY_PATHS, VESSEL_NEUTRAL } from "@/lib/arteries";
import { Myocardium } from "./heart/Myocardium";

function Tubes() {
  const geos = useMemo(
    () =>
      ARTERY_PATHS.map((a) => {
        const curve = new THREE.CatmullRomCurve3(a.points.map((p) => new THREE.Vector3(...p)));
        return new THREE.TubeGeometry(curve, 48, a.radius, 10, false);
      }),
    [],
  );
  return (
    <group>
      {geos.map((g, i) => (
        <mesh key={ARTERY_PATHS[i].vessel} geometry={g}>
          <meshStandardMaterial color={VESSEL_NEUTRAL} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

export function HeroSceneInner() {
  return (
    <div className="relative h-105 w-full overflow-hidden rounded-lg border border-border">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0.2, 3.6], fov: 42 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 4, 5]} intensity={1.2} />
        <directionalLight position={[-3, 1, -2]} intensity={0.35} />
        {/* Null fallback: no portals mount/unmount during streaming. */}
        <Suspense fallback={null}>
          <Myocardium />
        </Suspense>
        <Tubes />
        <OrbitControls
          makeDefault
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={1.2}
          target={[0, 0.1, 0]}
        />
      </Canvas>
    </div>
  );
}
