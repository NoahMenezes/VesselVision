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

export function VesselLegend({ inline = false }: { inline?: boolean }) {
  return (
    <div
      aria-label="Artery risk color scale"
      className={
        inline
          ? "tnum pointer-events-none flex items-center gap-2.5 rounded-full border border-white/10 bg-black/55 px-4 py-2 text-xs font-medium text-white/85 shadow-xl backdrop-blur-md"
          : "tnum pointer-events-none absolute bottom-2.5 left-2.5 flex gap-2.5 rounded-full border border-border/80 bg-surface/85 px-3 py-1.5 text-xs font-medium text-foreground shadow-md backdrop-blur"
      }
    >
      {BANDS.map((b) => (
        <span key={b.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-3 w-3 rounded-full shadow-sm"
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

/** Corner mini-map for the theatre stage: live-colored schematic plus
 *  keyboard-operable vessel buttons. Parent positions it absolutely. */
export function MiniMap() {
  const { prediction, selected, setSelected } = useStore();
  const colorOf = (v: VesselKey) => {
    const p = prediction?.vessels[v]?.probability ?? null;
    return p === null ? "#5b8a8a" : riskColor(p);
  };
  return (
    <div className="rounded-xl border border-white/15 bg-black/60 p-2 shadow-xl backdrop-blur">
      <svg
        viewBox="0 0 120 95"
        role="img"
        aria-label="Mini coronary schematic"
        className="mx-auto h-16 w-20"
      >
        <ellipse cx="60" cy="48" rx="34" ry="40" fill="none" stroke="#8a2f3c" strokeWidth="6" opacity="0.8" />
        {(Object.keys(SCHEMATIC_PATHS) as VesselKey[]).map((v) => (
          <path
            key={v}
            d={SCHEMATIC_PATHS[v]}
            fill="none"
            stroke={colorOf(v)}
            strokeWidth={selected === v ? 7 : 5}
            strokeLinecap="round"
          />
        ))}
      </svg>
      <div className="mt-1 flex gap-1" role="group" aria-label="Select vessel">
        {VESSELS.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={selected === v}
            aria-label={`Select ${ANATOMY_MAP[v]}`}
            onClick={() => setSelected(selected === v ? "CAD" : v)}
            className={clsx(
              "tnum flex-1 rounded-md border px-1.5 py-1 text-[10px] font-bold",
              selected === v
                ? "border-teal-300/60 bg-teal-300/15 text-teal-100"
                : "border-white/10 bg-white/5 text-white/75 hover:bg-white/15",
            )}
          >
            <span
              aria-hidden
              className="mr-1 inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: colorOf(v) }}
            />
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
