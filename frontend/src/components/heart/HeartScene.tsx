"use client";
/** R3F canvas: lights, clamped OrbitControls, gentle auto-rotate that stops
 *  on first interaction, click-empty-space deselects. Light by design: no
 *  post-processing, pixel ratio capped, memoized geometries.
 *
 *  Mouse: left-drag rotates, wheel zooms, right-drag pans (pan off, so the
 *  heart cannot get lost). Touch: one finger rotates, pinch zooms.
 *
 *  Theatre mode: a full-bleed dark stage. The canvas fills the whole dialog
 *  edge to edge — no boxes, no borders around the heart. All chrome floats:
 *  title top-left, control dock top-right, patient-values rail left
 *  (collapsible), risk legend bottom-center, 2D mini-map bottom-right.
 *  Esc closes; body scroll locks while open.
 */
import { Suspense, useEffect, useRef, useState } from "react";
import type { ElementRef } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useStore } from "@/store/VesselVisionContext";
import { ANATOMY_MAP } from "@/lib/arteries";
import { CoronaryTree } from "./CoronaryTree";
import { Myocardium } from "./Myocardium";
import { ArteryLabels } from "./ArteryLabels";
import { MiniMap, VesselLegend } from "./VesselLegend";
import { TheatreSidebar } from "./TheatreSidebar";

const CAMERA_PRESETS: Record<"front" | "back", { pos: [number, number, number]; label: string }> = {
  front: { pos: [0, 0.2, 3.4], label: "Front view" },
  back: { pos: [0, 0.2, -3.4], label: "Back view" },
};

const MIN_DIST = 1.6;
const MAX_DIST = 7;

const EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]";

function ToolBtn({
  onClick,
  label,
  dark,
  primary,
  active,
  children,
}: {
  onClick: () => void;
  label: string;
  dark?: boolean;
  primary?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={
        dark
          ? `rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-md transition-all duration-200 ${EASE} active:scale-[0.97] ${
              active
                ? "border-teal-300/50 bg-teal-300/15 text-teal-100"
                : "border-white/10 bg-white/[0.06] text-white/85 hover:bg-white/[0.14]"
            }`
          : primary
            ? `rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-black shadow-lg transition-all duration-200 ${EASE} hover:bg-white/85 active:scale-[0.97]`
            : `rounded-full border border-border bg-surface px-3.5 py-1 text-xs font-medium shadow-sm transition-colors hover:border-foreground/30 hover:bg-surface-soft ${
                active ? "border-accent text-accent" : ""
              }`
      }
    >
      {children}
    </button>
  );
}

/** Floating control cluster shared by the theatre header. */
function StageControls({
  onPreset,
  onZoom,
  spin,
  onSpin,
  faded,
  onFade,
  showLabels,
  onLabels,
}: {
  onPreset: (name: keyof typeof CAMERA_PRESETS | "reset") => void;
  onZoom: (factor: number) => void;
  spin: boolean;
  onSpin: () => void;
  faded: boolean;
  onFade: () => void;
  showLabels: boolean;
  onLabels: () => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5" role="toolbar" aria-label="Heart camera and display controls">
      <ToolBtn dark onClick={() => onPreset("front")} label="Front view">Front</ToolBtn>
      <ToolBtn dark onClick={() => onPreset("back")} label="Back view">Back</ToolBtn>
      <ToolBtn dark onClick={() => onPreset("reset")} label="Reset camera">Reset</ToolBtn>
      <ToolBtn dark onClick={() => onZoom(0.8)} label="Zoom in">＋ Zoom</ToolBtn>
      <ToolBtn dark onClick={() => onZoom(1.25)} label="Zoom out">－ Zoom</ToolBtn>
      <ToolBtn dark onClick={onSpin} label={spin ? "Pause rotation" : "Resume rotation"} active={spin}>
        {spin ? "❚❚ Spin" : "▶ Spin"}
      </ToolBtn>
      <ToolBtn dark onClick={onFade} label={faded ? "Show heart muscle" : "Fade heart muscle"} active={faded}>
        ◐ Muscle
      </ToolBtn>
      <ToolBtn dark onClick={onLabels} label={showLabels ? "Hide artery labels" : "Show artery labels"} active={showLabels}>
        Labels
      </ToolBtn>
    </div>
  );
}

export function HeartScene() {
  const { setSelected, selected, inputs } = useStore();
  const controls = useRef<ElementRef<typeof OrbitControls>>(null);
  const [spin, setSpin] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [faded, setFaded] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [railOpen, setRailOpen] = useState(
    () => typeof window === "undefined" || window.innerWidth >= 1024,
  );
  const closeRef = useRef<HTMLButtonElement>(null);

  // Theatre mode: lock scroll, focus close, Esc to exit.
  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

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

  const zoomBy = (factor: number) => {
    const c = controls.current;
    if (!c) return;
    const pos = c.object.position;
    const t = c.target;
    const vx = pos.x - t.x;
    const vy = pos.y - t.y;
    const vz = pos.z - t.z;
    const len = Math.hypot(vx, vy, vz) || 1;
    const next = Math.min(MAX_DIST, Math.max(MIN_DIST, len * factor));
    const s = next / len;
    pos.set(t.x + vx * s, t.y + vy * s, t.z + vz * s);
    c.update();
    setSpin(false);
  };

  const canvasTree = (dark: boolean) => (
    <>
      {dark ? (
        <>
          <ambientLight intensity={0.35} />
          <directionalLight position={[3, 4, 5]} intensity={1.6} />
          <directionalLight position={[-4, 2, -3]} intensity={0.6} color="#5eead4" />
          <directionalLight position={[0, -2, 3]} intensity={0.35} color="#f59e0b" />
        </>
      ) : (
        <>
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 4, 5]} intensity={1.2} />
          <directionalLight position={[-3, 1, -2]} intensity={0.35} />
        </>
      )}
      {/* Suspense with a null fallback: the GLB streams in without
          mounting/unmounting any portal. HeartCanvas shows the DOM
          loader until Canvas mounts; arteries render immediately. */}
      <Suspense fallback={null}>
        <Myocardium opacity={faded ? 0.08 : dark ? 0.5 : 0.45} />
      </Suspense>
      <CoronaryTree />
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enableRotate
        enableZoom
        enablePan={false}
        rotateSpeed={0.9}
        zoomSpeed={0.9}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
        autoRotate={spin}
        autoRotateSpeed={0.8}
        onStart={() => setSpin(false)}
        minDistance={MIN_DIST}
        maxDistance={MAX_DIST}
        target={[0, 0.1, 0]}
      />
    </>
  );

  /** Inline (dashboard card) viewport: boxed. Theatre uses the full-bleed
      branch below instead — no boxes, no borders around the heart. */
  const viewport = () => (
    <div className="relative h-105 w-full cursor-grab overflow-hidden rounded-xl border border-border shadow-sm active:cursor-grabbing">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.2, 3.4], fov: 42 }}
        onPointerMissed={() => setSelected("CAD")}
      >
        {canvasTree(false)}
      </Canvas>
      {showLabels && <ArteryLabels />}
      <VesselLegend />
    </div>
  );

  if (expanded) {
    const filled = Object.keys(inputs).length;
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Expanded 3D heart viewer"
        className="stage-enter fixed inset-0 z-50 overflow-hidden bg-[#060809] text-white"
      >
        {/* Stage backdrop: spotlight pool, floor glow, horizon hairline, grain.
            Pure CSS layers under the transparent canvas — zero GPU cost. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 62% 48% at 50% 40%, rgba(150,200,255,0.12), transparent 70%), radial-gradient(ellipse 90% 32% at 50% 92%, rgba(255,255,255,0.07), transparent 70%), linear-gradient(#060809, #060809)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
          }}
        />

        {/* The heart itself: edge to edge, no box, no border. */}
        <div className="absolute inset-0 cursor-grab active:cursor-grabbing">
          <Canvas
            dpr={[1, 1.5]}
            camera={{ position: [0, 0.2, 3.4], fov: 42 }}
            onPointerMissed={() => setSelected("CAD")}
          >
            {canvasTree(true)}
          </Canvas>
          {showLabels && <ArteryLabels />}
        </div>

        {/* Vignette above the canvas, below the chrome. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: "inset 0 0 190px 70px rgba(0,0,0,0.85)" }}
        />

        {/* Header: title left, controls right. */}
        <header className="stage-rise pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-x-6 gap-y-3 p-5 sm:p-7">
          <div className="pointer-events-auto max-w-md">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
              VesselVision · Cardiac stage
            </p>
            <h2 className="font-display pb-1 text-[26px] font-semibold leading-none tracking-[-0.01em] text-white">
              3D heart
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-white/55">
              {selected === "CAD"
                ? "Overall view. Select an artery to focus it."
                : `${selected} · ${ANATOMY_MAP[selected]}. Select empty space to clear.`}
            </p>
            <p className="mt-1 text-[11px] text-white/35">
              Drag to rotate · Scroll to zoom · Click a vessel to inspect
            </p>
          </div>
          <div className="pointer-events-auto flex max-w-xl flex-wrap items-center justify-end gap-1.5">
            <StageControls
              onPreset={applyPreset}
              onZoom={zoomBy}
              spin={spin}
              onSpin={() => setSpin((s) => !s)}
              faded={faded}
              onFade={() => setFaded((f) => !f)}
              showLabels={showLabels}
              onLabels={() => setShowLabels((v) => !v)}
            />
            <button
              ref={closeRef}
              type="button"
              aria-label="Close expanded heart view"
              onClick={() => setExpanded(false)}
              className={`rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black shadow-lg transition-all duration-200 ${EASE} hover:bg-white/85 active:scale-[0.97]`}
            >
              ✕ Close
            </button>
          </div>
        </header>

        {/* Left rail: patient values drive the heart. Collapsible. */}
        {railOpen ? (
          <div className="stage-rise absolute bottom-5 left-5 top-44 w-[300px] max-lg:bottom-4 max-lg:left-4 max-lg:right-4 max-lg:top-auto max-lg:max-h-[52vh] max-lg:w-auto sm:top-40">
            <button
              type="button"
              aria-label="Collapse patient values"
              onClick={() => setRailOpen(false)}
              className="absolute -right-3 top-1/2 z-10 hidden h-8 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#121518] text-sm text-white/70 shadow-lg transition-colors hover:text-white lg:flex"
            >
              ‹
            </button>
            <TheatreSidebar />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setRailOpen(true)}
            aria-label="Open patient values"
            className={`tnum absolute left-5 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-black/55 px-4 py-2 text-xs font-semibold text-white/85 shadow-xl backdrop-blur-md transition-all duration-200 ${EASE} hover:bg-black/75 active:scale-[0.97]`}
          >
            Values · {filled} set ›
          </button>
        )}

        {/* Risk legend docked bottom-center. */}
        <div className="stage-rise pointer-events-none absolute bottom-5 left-1/2 hidden -translate-x-1/2 sm:block">
          <VesselLegend inline />
        </div>

        {/* 2D mini-map pinned bottom-right, in front. */}
        <div className="stage-rise absolute bottom-5 right-5 w-36 sm:w-44">
          <MiniMap />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2.5 flex items-center gap-1.5" role="toolbar" aria-label="Heart camera views">
        {(Object.keys(CAMERA_PRESETS) as (keyof typeof CAMERA_PRESETS)[]).map((k) => (
          <ToolBtn key={k} onClick={() => applyPreset(k)} label={CAMERA_PRESETS[k].label}>
            {k === "front" ? "Front" : "Back"}
          </ToolBtn>
        ))}
        <ToolBtn onClick={() => applyPreset("reset")} label="Reset camera">
          Reset
        </ToolBtn>
        <span className="flex-1" />
        <ToolBtn primary onClick={() => setExpanded(true)} label="Expand 3D heart to fullscreen">
          ⤢ Expand
        </ToolBtn>
      </div>
      {viewport()}
    </div>
  );
}
