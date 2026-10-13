"use client";
/** How sure is this? Dedicated uncertainty section: per-target typical
 *  variation bands from GET /uncertainty (repeated validation rounds on
 *  303 patients). Model-level honesty — how much scores wobble across
 *  rounds — not a per-patient error bar, and labeled that way.
 */
import { useEffect, useState } from "react";
import { getUncertainty } from "@/lib/api";
import { ANATOMY_MAP } from "@/lib/arteries";
import type { UncertaintyResponse } from "@/lib/types";
import { Card } from "../ui";

const NAMES: Record<string, string> = {
  CAD: "Overall heart disease",
  LAD: ANATOMY_MAP.LAD,
  LCX: ANATOMY_MAP.LCX,
  RCA: ANATOMY_MAP.RCA,
};

const ORDER = ["CAD", "LAD", "LCX", "RCA"];

export function UncertaintyPanel() {
  const [bands, setBands] = useState<UncertaintyResponse | null>(null);

  useEffect(() => {
    getUncertainty().then(setBands);
  }, []);

  return (
    <Card>
      <h3 className="mb-1 text-sm font-medium">How sure is this?</h3>
      {bands === null ? (
        <p className="text-xs text-foreground/60">
          Variation bands appear here once checking is finished.
        </p>
      ) : (
        <>
          <div className="space-y-2.5">
            {ORDER.filter((t) => bands[t]).map((t) => {
              const b = bands[t];
              const lo = Math.max(0, Math.round(b.accuracy - b.plusminus));
              const hi = Math.min(100, Math.round(b.accuracy + b.plusminus));
              return (
                <div key={t}>
                  <div className="tnum flex items-baseline justify-between text-xs">
                    <span className="font-semibold">
                      {t} <span className="font-normal text-muted">{NAMES[t]}</span>
                    </span>
                    <span>
                      right <span className="font-bold">{Math.round(b.accuracy)}%</span> of the
                      time, <span className="font-bold">±{b.plusminus}</span>
                    </span>
                  </div>
                  <div
                    role="img"
                    aria-label={`${t} accuracy ${Math.round(b.accuracy)} percent plus or minus ${b.plusminus}`}
                    className="relative mt-1 h-2 rounded-full bg-surface-soft"
                  >
                    <div
                      className="absolute h-full rounded-full bg-accent/40"
                      style={{ left: `${lo}%`, width: `${Math.max(1, hi - lo)}%` }}
                    />
                    <div
                      className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded bg-foreground"
                      style={{ left: `${Math.round(b.accuracy)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2.5 text-[11px] leading-relaxed text-foreground/50">
            Bands are typical variation across {bands.CAD?.rounds ?? "repeated"} validation
            rounds on 303 patients — how much scores wobble between rounds, not a
            personal error bar. Vessel bands run wider than overall: smaller
            signals, noisier answers.
          </p>
        </>
      )}
    </Card>
  );
}
