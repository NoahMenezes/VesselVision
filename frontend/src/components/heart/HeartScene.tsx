"use client";
/** R3F canvas: lights, clamped OrbitControls, gentle auto-rotate that stops
 *  on first interaction, click-empty-space deselects. Light by design: no
 *  post-processing, pixel ratio capped, memoized geometries.
 */
import { Suspense, useRef, useState } from "react";
import type { ElementRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useStore } from "@/store/VesselVisionContext";
import { CoronaryTree } from "./CoronaryTree";
import { Myocardium } from "./Myocardium";
import { ArteryLabels } from "./ArteryLabels";
import { VesselLegend } from "./VesselLegend";

const CAMERA_PRESETS: Record<"front" | "back", { pos: [number, number, number]; label: string }> = {
  front: { pos: [0, 0.2, 3.4], label: "Front view" },
  back: { pos: [0, 0.2, -3.4], label: "Back view" },
};

export function HeartScene() {
  const { setSelected } = useStore();
  const controls = useRef<ElementRef<typeof OrbitControls>>(null);
  const [spin, setSpin] = useState(true);

  const applyPreset = (name: keyof typeof CAMERA_PRESETS | "reset") => {
    const c = controls.current;
    if (!c) return;
    if (name === "reset") {
      c.reset();
    } else {
      c.object.position.set(...CAMERA_PRESETS[name].pos);
      c.target.set(0, 0.1, 0);
      c.update();
    }
    setSpin(false);
  };

  return (
    <div>
      <div className="mb-2 flex gap-2" role="toolbar" aria-label="Heart camera views">
        {(Object.keys(CAMERA_PRESETS) as (keyof typeof CAMERA_PRESETS)[]).map((k) => (
          <button
            key={k}
            type="button"
            aria-label={CAMERA_PRESETS[k].label}
            onClick={() => applyPreset(k)}
            className="rounded border border-border px-3 py-1 text-xs hover:bg-black/[0.04]"
          >
            {k === "front" ? "Front" : "Back"}
          </button>
        ))}
        <button
          type="button"
          aria-label="Reset camera"
          onClick={() => applyPreset("reset")}
          className="rounded border border-border px-3 py-1 text-xs hover:bg-black/[0.04]"
        >
          Reset
        </button>
      </div>
      <div className="relative h-105 w-full overflow-hidden rounded-lg border border-border">
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 0.2, 3.4], fov: 42 }}
          onPointerMissed={() => setSelected("CAD")}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 4, 5]} intensity={1.2} />
          <directionalLight position={[-3, 1, -2]} intensity={0.35} />
          {/* Suspense with a null fallback: the GLB streams in without
              mounting/unmounting any portal. HeartCanvas shows the DOM
              loader until Canvas mounts; arteries render immediately. */}
          <Suspense fallback={null}>
            <Myocardium />
          </Suspense>
          <CoronaryTree />
          <OrbitControls
            ref={controls}
            makeDefault
            enableDamping
            autoRotate={spin}
            autoRotateSpeed={0.8}
            onStart={() => setSpin(false)}
            minDistance={1.6}
            maxDistance={7}
            target={[0, 0.1, 0]}
          />
        </Canvas>
        <ArteryLabels />
        <VesselLegend />
      </div>
    </div>
  );
}
