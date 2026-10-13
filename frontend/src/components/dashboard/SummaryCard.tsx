"use client";
/** Overall CAD summary (Phase 12 shell). Reads live prediction from the
 *  store; empty state until the first prediction arrives. No fake numbers.
 */
import { ANATOMY_MAP } from "@/lib/arteries";
import type { SelectedTarget } from "@/lib/types";
import { useStore } from "@/store/VesselVisionContext";
import { Badge, Card } from "../ui";

export function SummaryCard({ onSelect }: { onSelect: (t: SelectedTarget) => void }) {
  const { prediction, loading, selected } = useStore();
  return (
    <Card>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-medium">Overall CAD status</h3>
        {prediction ? (
          <Badge tone={prediction.cad.label === 1 ? "high" : "low"}>
            {prediction.cad.label === 1 ? "CAD likely" : "CAD unlikely"}
          </Badge>
        ) : (
          <Badge tone="neutral">{loading ? "Scoring…" : "Awaiting input"}</Badge>
        )}
      </div>
      {prediction ? (
        <button
          type="button"
          onClick={() => onSelect("CAD")}
          aria-pressed={selected === "CAD"}
          className="tnum mt-1 w-full rounded-lg border border-border p-3 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.07]"
        >
          <span className="text-2xl font-semibold">
            {Math.round(prediction.cad.probability * 100)}%
          </span>
          <span className="ml-2 text-xs text-foreground/60">
            chance of disease (high over {Math.round(prediction.cad.threshold * 100)}%)
          </span>
          <span className="block text-[11px] text-foreground/50">
            {ANATOMY_MAP.LAD}, {ANATOMY_MAP.LCX} and RCA views update from the vessel cards below.
          </span>
        </button>
      ) : (
        <p className="text-xs text-foreground/60">
          Enter patient data or load an example to score overall coronary artery disease status.
        </p>
      )}
    </Card>
  );
}
