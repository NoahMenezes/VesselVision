"use client";
/** On-canvas legend (display bands) + accessible 2D schematic fallback with
 *  keyboard-operable vessel buttons. Colors mirror the 3D arteries exactly
 *  (same riskColor source); neutral until predictions arrive.
 */
import { ANATOMY_MAP, riskColor } from "@/lib/arteries";
import type { VesselKey } from "@/lib/types";
import { useStore } from "@/store/VesselVisionContext";
import { clsx } from "clsx";

const VESSELS: VesselKey[] = ["LAD", "LCX", "RCA"];

// Display bands for the color scale (dashboard convention; the binary
// decide-threshold per vessel comes from the API and is shown in Phase 12).
const BANDS = [
  { color: "#22c55e", label: "< 30% low" },
  { color: "#f59e0b", label: "30-70% moderate" },
  { color: "#ef4444", label: "> 70% high" },
];

export function VesselLegend() {
  return (
    <div
      aria-label="Artery risk color scale"
      className="pointer-events-none absolute bottom-2 left-2 flex gap-2 rounded-xl border border-border bg-surface/90 px-2 py-1 text-[11px]"
    >
      {BANDS.map((b) => (
        <span key={b.label} className="flex items-center gap-1">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: b.color }}
          />
          {b.label}
        </span>
      ))}
    </div>
  );
}

const SCHEMATIC_PATHS: Record<VesselKey, string> = {
  LAD: "M60 10 L55 45 L52 80",
  LCX: "M60 10 L85 25 L95 55",
  RCA: "M60 10 L35 25 L28 60",
};

export function Schematic2D() {
  const { prediction, selected, setSelected } = useStore();
  const colorOf = (v: VesselKey) => {
    const p = prediction?.vessels[v]?.probability ?? null;
    return p === null ? "#5b8a8a" : riskColor(p);
  };
  return (
    <div className="mt-2 rounded-xl border border-border p-3">
      <p className="mb-1 text-xs text-foreground/60">
        2D schematic (same colors as 3D). Buttons select vessels.
      </p>
      <div className="flex items-center gap-3">
        <svg
          viewBox="0 0 120 95"
          role="img"
          aria-label="Simplified coronary schematic"
          className="h-24 w-28 shrink-0"
        >
          <ellipse cx="60" cy="48" rx="34" ry="40" fill="none" stroke="#8a2f3c" strokeWidth="5" opacity="0.7" />
          {(Object.keys(SCHEMATIC_PATHS) as VesselKey[]).map((v) => (
            <path
              key={v}
              d={SCHEMATIC_PATHS[v]}
              fill="none"
              stroke={colorOf(v)}
              strokeWidth={selected === v ? 6 : 4}
              strokeLinecap="round"
            />
          ))}
        </svg>
        <div className="flex flex-col gap-1" role="group" aria-label="Select vessel">
          {VESSELS.map((v) => {
            const p = prediction?.vessels[v]?.probability ?? null;
            return (
              <button
                key={v}
                type="button"
                aria-pressed={selected === v}
                onClick={() => setSelected(selected === v ? "CAD" : v)}
                className={clsx(
                  "tnum rounded-xl border px-3 py-1 text-left text-xs",
                  selected === v ? "border-accent" : "border-border hover:bg-white/5",
                )}
              >
                {v} ({ANATOMY_MAP[v]})
                <span className="ml-2 text-foreground/60">
                  {p === null ? "no prediction" : `${Math.round(p * 100)}%`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
