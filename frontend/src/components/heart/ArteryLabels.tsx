"use client";
/** DOM vessel labels positioned by Projector (see CoronaryTree). Plain divs
 *  in normal React — no drei portals, so nothing for concurrent rendering
 *  to tear down. Chips register themselves for per-frame positioning.
 */
import { useEffect, useRef } from "react";
import { clsx } from "clsx";
import { ANATOMY_MAP, ARTERY_PATHS, VESSEL_NEUTRAL, riskColor, riskLevel } from "@/lib/arteries";
import type { VesselKey } from "@/lib/types";
import { useStore } from "@/store/VesselVisionContext";
import { labelEls } from "./CoronaryTree";

function Chip({ vessel }: { vessel: VesselKey }) {
  const { selected, setSelected, prediction, hoverVessel } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const prob = prediction?.vessels[vessel]?.probability ?? null;
  const active = selected === vessel;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    labelEls.set(vessel, el);
    return () => {
      if (labelEls.get(vessel) === el) labelEls.delete(vessel);
    };
  }, [vessel]);

  return (
    <div
      ref={ref}
      className="pointer-events-auto absolute left-0 top-0 flex flex-col items-center"
      style={{ opacity: 0, visibility: "hidden" }}
    >
      <button
        type="button"
        data-chip
        aria-label={`Select ${ANATOMY_MAP[vessel]}`}
        aria-pressed={active}
        onClick={() => setSelected(active ? "CAD" : vessel)}
        className={clsx(
          "tnum flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-wide shadow-md backdrop-blur transition-colors",
          active
            ? "border-accent bg-foreground text-background"
            : "border-border bg-surface/90 text-foreground hover:border-foreground/40",
        )}
      >
        <span
          aria-hidden
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: prob === null ? VESSEL_NEUTRAL : riskColor(prob) }}
        />
        {vessel}
        {active && prob !== null && (
          <span key={Math.round(prob * 100)} className="chip-pop inline-block font-bold">
            {Math.round(prob * 100)}%
          </span>
        )}
      </button>
      {hoverVessel === vessel && (
        <div className="tnum mt-1 whitespace-nowrap rounded-lg border border-border bg-surface/95 px-2 py-1 text-[11px] text-foreground shadow-md backdrop-blur">
          {ANATOMY_MAP[vessel]}:{" "}
          {prob === null ? "awaiting prediction" : `${Math.round(prob * 100)}% (${riskLevel(prob)} risk)`}
        </div>
      )}
    </div>
  );
}

export function ArteryLabels() {
  return (
    <div aria-hidden={false} className="pointer-events-none absolute inset-0 overflow-hidden">
      {ARTERY_PATHS.map((a) => (
        <Chip key={a.vessel} vessel={a.vessel} />
      ))}
    </div>
  );
}
