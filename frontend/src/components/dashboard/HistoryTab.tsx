"use client";
/** Checkup history dashboard (needs DATABASE_URL/Neon server-side).
 *  Trend chart of CAD risk over saved checkups plus the full table:
 *  reload any row into the form, delete what you don't need. When the
 *  database is off, this says so with setup guidance instead of breaking.
 */
import { useCallback, useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { deleteHistory, getHistory } from "@/lib/api";
import type { HistoryRecord } from "@/lib/types";
import { useStore } from "@/store/VesselVisionContext";
import { riskColor } from "@/lib/arteries";
import { Button, Card } from "../ui";

function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso.slice(0, 10)
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function HistoryTab() {
  const { setInputs, setError, setView } = useStore();
  const [rows, setRows] = useState<HistoryRecord[] | null>(null);

  const refresh = useCallback(() => {
    getHistory().then(setRows);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (rows === null) {
    return (
      <Card>
        <h2 className="mb-1 text-[15px] font-semibold tracking-tight">History</h2>
        <p className="text-xs leading-relaxed text-foreground/60">
          History needs a database. Create a free project at neon.tech, put its
          connection string in backend <code>DATABASE_URL</code>, and restart the API.
        </p>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <h2 className="mb-1 text-[15px] font-semibold tracking-tight">History</h2>
        <p className="text-xs text-foreground/60">
          No checkups saved yet. Open the Report tab and press Save checkup.
        </p>
      </Card>
    );
  }

  const trend = rows
    .slice()
    .reverse()
    .map((r) => ({ date: shortDate(r.created_at), cad: Math.round(r.cad * 100) }));

  const load = (r: HistoryRecord) => {
    setInputs({ ...r.inputs });
    setError(null);
    setView("overview");
  };

  const remove = (id: number) => {
    void deleteHistory(id).then((ok) => {
      if (ok) refresh();
      else setError("Couldn't delete that row. Try again.");
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight">History</h2>
        <p className="tnum mt-0.5 text-xs text-muted">
          {rows.length} saved checkup{rows.length === 1 ? "" : "s"} · newest first
        </p>
      </div>

      {rows.length >= 2 && (
        <Card>
          <h3 className="mb-1 text-sm font-medium">CAD risk over time</h3>
          <div className="h-48 text-foreground/70">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ left: -18, right: 8, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "currentColor" }} />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    fontSize: 12,
                    color: "var(--foreground)",
                  }}
                  formatter={(v) => [`${v}%`, "CAD risk"]}
                />
                <Line
                  type="monotone"
                  dataKey="cad"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card>
        <h3 className="mb-2 text-sm font-medium">Saved checkups</h3>
        <div className="max-sm:overflow-x-auto">
          <table className="tnum w-full text-left text-xs max-sm:min-w-[560px]">
            <thead>
              <tr className="text-foreground/50">
                <th className="py-1 pr-2 font-medium">Date</th>
                <th className="py-1 pr-2 font-medium">Note</th>
                <th className="py-1 pr-2 font-medium">CAD</th>
                <th className="py-1 pr-2 font-medium">LAD</th>
                <th className="py-1 pr-2 font-medium">LCX</th>
                <th className="py-1 pr-2 font-medium">RCA</th>
                <th className="py-1 font-medium">Open</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="py-1.5 pr-2">{shortDate(r.created_at)}</td>
                  <td className="py-1.5 pr-2 text-muted">{r.label || "—"}</td>
                  <td className="py-1.5 pr-2 font-bold">
                    <span
                      aria-hidden
                      className="mr-1.5 inline-block h-2 w-2 rounded-full"
                      style={{ background: riskColor(r.cad) }}
                    />
                    {Math.round(r.cad * 100)}%
                  </td>
                  <td className="py-1.5 pr-2">{Math.round(r.lad * 100)}%</td>
                  <td className="py-1.5 pr-2">{Math.round(r.lcx * 100)}%</td>
                  <td className="py-1.5 pr-2">{Math.round(r.rca * 100)}%</td>
                  <td className="py-1.5">
                    <span className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => load(r)}
                        className="font-semibold text-accent hover:underline"
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(r.id)}
                        aria-label={`Delete checkup from ${shortDate(r.created_at)}`}
                        className="text-muted hover:text-risk-high"
                      >
                        ✕
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex justify-end print:hidden">
        <Button variant="ghost" onClick={() => window.print()}>
          Print / Save PDF
        </Button>
      </div>
    </div>
  );
}
