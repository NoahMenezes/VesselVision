"use client";
/** Data labels: the uploaded numbers, pinned to the heart in 3D.
 *
 *  Same trick as the artery chips — plain DOM chips outside the Canvas,
 *  positioned every frame by DataProjector inside it (no drei portals, so
 *  nothing for concurrent rendering to tear down). Only filled fields show,
 *  values refresh live from the store. Display-only, never intercept clicks.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useStore } from "@/store/VesselVisionContext";

/** DOM chip registry shared with the projector (module scope, not state). */
export const dataLabelEls = new Map<string, HTMLElement>();

interface DataField {
  name: string;
  short: string;
  unit: string;
  anchor: [number, number, number];
  format: (v: number | string) => string;
}

const plain = (v: number | string) => String(v);
const kilo = (v: number | string) =>
  typeof v === "number" ? `${(v / 1000).toFixed(1)}k` : String(v);

const DATA_FIELDS: DataField[] = [
  { name: "pr", short: "Pulse", unit: "bpm", anchor: [-1.2, 0.55, 0.2], format: plain },
  { name: "bp", short: "BP", unit: "mmHg", anchor: [-1.25, 0.0, 0.2], format: plain },
  { name: "ef_tte", short: "EF", unit: "%", anchor: [1.2, 0.5, 0.1], format: plain },
  { name: "ldl", short: "LDL", unit: "mg/dL", anchor: [1.25, -0.05, 0.1], format: plain },
  { name: "wbc", short: "WBC", unit: "", anchor: [-0.9, -0.9, 0.3], format: kilo },
  { name: "fbs", short: "Sugar", unit: "mg/dL", anchor: [0.9, -0.9, 0.3], format: plain },
];

/** Runs inside the Canvas: writes projected screen positions into the DOM
 *  overlay chips (no React state per frame: direct DOM mutation). */
export function DataProjector() {
  const { size, camera } = useThree();
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    for (const f of DATA_FIELDS) {
      const el = dataLabelEls.get(f.name);
      if (!el) continue;
      tmp.set(f.anchor[0], f.anchor[1], f.anchor[2]).project(camera);
      const behind = tmp.z > 1;
      const x = (tmp.x * 0.5 + 0.5) * size.width;
      const y = (-tmp.y * 0.5 + 0.5) * size.height;
      el.style.opacity = behind ? "0" : "1";
      el.style.visibility = "visible";
      el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
  });
  return null;
}

function DataChip({ field, value }: { field: DataField; value: number | string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    dataLabelEls.set(field.name, el);
    return () => {
      if (dataLabelEls.get(field.name) === el) dataLabelEls.delete(field.name);
    };
  }, [field.name]);

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute left-0 top-0"
      style={{ opacity: 0, visibility: "hidden" }}
    >
      <div className="tnum flex items-baseline gap-1.5 whitespace-nowrap rounded-full border border-white/15 bg-black/65 px-2.5 py-1 text-[11px] shadow-lg backdrop-blur-md">
        <span className="font-medium uppercase tracking-wide text-white/50">{field.short}</span>
        <span key={String(value)} className="chip-pop inline-block font-bold text-white">
          {field.format(value)}
          {field.unit ? <span className="font-normal text-white/45"> {field.unit}</span> : null}
        </span>
      </div>
    </div>
  );
}

export function DataLabels() {
  const { inputs } = useStore();
  const shown = DATA_FIELDS.filter((f) => inputs[f.name] !== undefined);
  if (shown.length === 0) return null;
  return (
    <div aria-hidden={false} className="pointer-events-none absolute inset-0 overflow-hidden">
      {shown.map((f) => (
        <DataChip key={f.name} field={f} value={inputs[f.name]} />
      ))}
    </div>
  );
}
