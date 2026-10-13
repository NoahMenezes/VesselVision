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
          : "tnum pointer-events-none absolute bottom-2.5 left-2.5 flex gap-2.5 rounded-full border border-border/80 bg-white/85 px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur"
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

export function Schematic2D({ dark = false }: { dark?: boolean }) {
  const { prediction, selected, setSelected } = useStore();
  const colorOf = (v: VesselKey) => {
    const p = prediction?.vessels[v]?.probability ?? null;
    return p === null ? "#5b8a8a" : riskColor(p);
  };
  return (
    <div
      className={
        dark
          ? "rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur"
          : "mt-2 rounded-lg border border-border p-3"
      }
    >
      <p className={dark ? "mb-3 text-xs leading-relaxed text-white/55" : "mb-1 text-xs text-foreground/60"}>
        2D schematic (same colors as 3D). Buttons select vessels.
      </p>
      <div className={dark ? "flex flex-col items-stretch gap-3" : "flex items-center gap-3"}>
        <svg
          viewBox="0 0 120 95"
          role="img"
          aria-label="Simplified coronary schematic"
          className={dark ? "mx-auto h-28 w-32" : "h-24 w-28 shrink-0"}
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
        <div className={dark ? "grid gap-1.5" : "flex flex-col gap-1"} role="group" aria-label="Select vessel">
          {VESSELS.map((v) => {
            const p = prediction?.vessels[v]?.probability ?? null;
            return (
              <button
                key={v}
                type="button"
                aria-pressed={selected === v}
                onClick={() => setSelected(selected === v ? "CAD" : v)}
                className={clsx(
                  "tnum rounded-lg border px-3 py-2 text-left text-xs",
                  dark
                    ? selected === v
                      ? "border-teal-300/60 bg-teal-300/10 text-white"
                      : "border-white/10 bg-white/5 text-white/85 hover:bg-white/10"
                    : selected === v
                      ? "border-accent"
                      : "border-border hover:bg-black/[0.04]",
                )}
              >
                <span className="flex items-center gap-1.5 font-semibold">
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: colorOf(v) }}
                  />
                  {v} <span className={dark ? "font-normal text-white/50" : "font-normal text-foreground/60"}>({ANATOMY_MAP[v]})</span>
                </span>
                <span className={dark ? "ml-3.5 text-white/50" : "ml-2 text-foreground/60"}>
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
