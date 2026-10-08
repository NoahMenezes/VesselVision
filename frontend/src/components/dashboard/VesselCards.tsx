"use client";
/** Per-vessel cards (Phase 12 shell). Probability bars from live predictions;
 *  selection syncs with the 3D view through the store. Empty state pre-first
 *  prediction.
 */
import { ANATOMY_MAP, riskLevel } from "@/lib/arteries";
import type { VesselKey } from "@/lib/types";
import { useStore } from "@/store/VesselVisionContext";
import { Badge, Card } from "../ui";
import { clsx } from "clsx";

const VESSELS: VesselKey[] = ["LAD", "LCX", "RCA"];

export function VesselCards() {
  const { prediction, selected, setSelected } = useStore();
  return (
    <Card>
      <h3 className="mb-2 text-sm font-medium">Vessel stenosis</h3>
      <div className="space-y-2">
        {VESSELS.map((v) => {
          const r = prediction?.vessels[v] ?? null;
          const pct = r === null ? null : Math.round(r.probability * 100);
          const level = r === null ? null : riskLevel(r.probability);
          return (
            <button
              key={v}
              type="button"
              aria-pressed={selected === v}
              onClick={() => setSelected(selected === v ? "CAD" : v)}
              className={clsx(
                "tnum w-full rounded-xl border p-2 text-left text-xs hover:bg-white/5",
                selected === v ? "border-accent" : "border-border",
              )}
            >
              <span className="flex items-center justify-between">
                <span className="font-medium">
                  {v} <span className="font-normal text-foreground/50">{ANATOMY_MAP[v]}</span>
                </span>
                {r === null || level === null ? (
                  <Badge tone="neutral">no prediction</Badge>
                ) : (
                  <Badge tone={level}>{level} {pct}%</Badge>
                )}
              </span>
              <span
                aria-hidden
                className="mt-1 block h-1.5 overflow-hidden rounded-full bg-white/10"
              >
                <span
                  className="block h-full rounded-full transition-all"
                  style={{
                    width: `${pct ?? 0}%`,
                    background: r === null ? "transparent"
                      : level === "high" ? "#ef4444" : level === "moderate" ? "#f59e0b" : "#22c55e",
                  }}
                />
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
