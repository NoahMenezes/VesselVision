"use client";
/** DOM vessel labels positioned by Projector (see CoronaryTree). Plain divs
 *  in normal React — no drei portals, so nothing for concurrent rendering
 *  to tear down. Chips register themselves for per-frame positioning.
 */
import { useEffect, useRef } from "react";
import { ANATOMY_MAP, ARTERY_PATHS, riskLevel } from "@/lib/arteries";
import type { VesselKey } from "@/lib/types";
import { useStore } from "@/store/VesselVisionContext";
import { labelEls } from "./CoronaryTree";

function Chip({ vessel }: { vessel: VesselKey }) {
  const { selected, setSelected, prediction, hoverVessel } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const prob = prediction?.vessels[vessel]?.probability ?? null;

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
        aria-label={`Select ${ANATOMY_MAP[vessel]}`}
        aria-pressed={selected === vessel}
        onClick={() => setSelected(selected === vessel ? "CAD" : vessel)}
        className="rounded-full border border-border bg-surface/90 px-2 py-0.5 text-[11px] font-medium"
      >
        {vessel}
      </button>
      {hoverVessel === vessel && (
        <div className="tnum mt-1 whitespace-nowrap rounded-lg border border-border bg-surface px-2 py-1 text-[11px]">
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
