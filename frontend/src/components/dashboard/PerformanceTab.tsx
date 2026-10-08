"use client";
/** Model performance tab (reads GET /metrics; honest pending state until
 *  Phase 5 writes metrics.json). Plus a print-view report button.
 */
import { useEffect, useState } from "react";
import axios from "axios";
import { Button, Card } from "../ui";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function PerformanceTab() {
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    axios.get(`${BASE}/metrics`).then((r) => setMetrics(r.data)).catch(() => setMetrics(null));
  }, []);
  return (
    <Card>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-medium">Model performance</h3>
        <Button variant="ghost" onClick={() => window.print()}>
          Print report
        </Button>
      </div>
      {metrics === null ? (
        <p className="text-xs text-foreground/60">
          Held-out metrics (accuracy, precision, recall, F1, ROC-AUC per target)
          appear here after Phase 5 evaluation. Expect wide intervals: n=303.
        </p>
      ) : (
        <pre className="tnum overflow-auto text-[11px]">{JSON.stringify(metrics, null, 2)}</pre>
      )}
    </Card>
  );
}
