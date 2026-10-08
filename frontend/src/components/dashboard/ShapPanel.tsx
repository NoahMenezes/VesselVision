"use client";
/** SHAP explanation panel (Phase 12 shell). Diverging horizontal bars of the
 *  top contributors for the selected target, with values + units. Template
 *  plain-language summary (no LLM). Empty state until /explain is live.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStore } from "@/store/VesselVisionContext";
import { Card } from "../ui";

export function ShapPanel() {
  const { explanation, selected } = useStore();
  const rows = (explanation?.contributions ?? [])
    .slice()
    .sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value))
    .slice(0, 10);
  const top = rows[0];

  return (
    <Card>
      <h3 className="mb-1 text-sm font-medium">
        Why this {selected === "CAD" ? "CAD" : `${selected} stenosis`} prediction
      </h3>
      {rows.length === 0 ? (
        <p className="text-xs text-foreground/60">
          What pushed the result up or down appears here once reasons are ready.
          Click a vessel card or the 3D arteries to change the explained target.
        </p>
      ) : (
        <>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D5DBE0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#FFFFFF", border: "1px solid #D5DBE0", fontSize: 12 }}
                  formatter={(v, _name, p) => {
                    const r = p?.payload as { value: unknown; unit: string | null } | undefined;
                    return [`${v} (measured ${String(r?.value)}${r?.unit ? ` ${r.unit}` : ""})`, "Effect"];
                  }}
                />
                <ReferenceLine x={0} stroke="#e6edf3" />
                <Bar dataKey="shap_value">
                  {rows.map((r) => (
                    <Cell key={r.feature} fill={r.direction === "increases" ? "#ef4444" : "#3b82f6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {top && (
            <p className="tnum mt-2 text-xs text-foreground/70">
              Top driver: {top.label} ({String(top.value)}{top.unit ? ` ${top.unit}` : ""}){" "}
              {top.direction === "increases" ? "pushes risk up" : "pushes risk down"} most.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
