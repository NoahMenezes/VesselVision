"use client";
/** How accurate is this? Per-target score cards in plain words, no raw dump.
 *  Reads GET /metrics; honest pending state until final evaluation lands.
 */
import { useEffect, useState } from "react";
import axios from "axios";
import { ANATOMY_MAP } from "@/lib/arteries";
import { Button, Card } from "../ui";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface TargetScore {
  accuracy: number;
  recall: number;
  roc_auc: number;
}

const NAMES: Record<string, string> = {
  CAD: "Overall heart disease",
  LAD: ANATOMY_MAP.LAD,
  LCX: ANATOMY_MAP.LCX,
  RCA: ANATOMY_MAP.RCA,
};

function pct(x: number) {
  return `${Math.round(x * 100)}%`;
}

export function PerformanceTab() {
  const [metrics, setMetrics] = useState<Record<string, TargetScore> | null>(null);
  useEffect(() => {
    axios.get(`${BASE}/metrics`).then((r) => setMetrics(r.data)).catch(() => setMetrics(null));
  }, []);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">How accurate is this?</h2>
          <p className="tnum mt-1 text-sm text-muted">
            Tested on 61 patients the models never saw. Small study, so expect wide ranges.
          </p>
        </div>
        <Button variant="ghost" onClick={() => window.print()}>
          Print report
        </Button>
      </div>
      {metrics === null ? (
        <Card>
          <p className="text-sm text-muted">
            Scores appear here once checking is finished.
          </p>
        </Card>
      ) : (
        (Object.keys(NAMES) as (keyof typeof NAMES)[]).map((t) => {
          const m = metrics[t];
          if (!m) return null;
          const rows: [string, string][] = [
            ["Correct overall", pct(m.accuracy)],
            ["Catches the sick", pct(m.recall)],
            ["Ranking quality", pct(m.roc_auc)],
          ];
          return (
            <Card key={t}>
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-bold">
                  {t} <span className="font-normal text-muted">{NAMES[t]}</span>
                </h3>
                <span className="tnum text-2xl font-bold">{pct(m.accuracy)}</span>
              </div>
              <dl className="tnum mt-2 divide-y divide-border-soft text-sm">
                {rows.map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5">
                    <dt className="text-muted">{k}</dt>
                    <dd className="font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          );
        })
      )}
    </div>
  );
}
