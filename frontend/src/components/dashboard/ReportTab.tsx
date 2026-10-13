"use client";
/** Full medical report in fixed tables: header, overall + per-artery results
 *  with decide lines, every entered measurement against its normal range,
 *  and every scored reason. Print (or save-as-PDF) via the button — the
 *  print stylesheet forces light paper, hides app chrome, and keeps rows
 *  unsplit. Everything on screen lands in the PDF; nothing lazy or cut off.
 */
import { useEffect, useState } from "react";
import { getSchema } from "@/lib/api";
import type { FeatureSchema, VesselKey } from "@/lib/types";
import { ANATOMY_MAP, riskColor } from "@/lib/arteries";
import { useStore } from "@/store/VesselVisionContext";
import { outOfRange } from "./MeasurementsTable";
import { Badge, Button, Card } from "../ui";

const VESSELS: VesselKey[] = ["LAD", "LCX", "RCA"];

/** Clean clinical figures: integers stay whole, the rest to 2 decimals. */
function fmt(v: number | string): string {
  if (typeof v !== "number") return v;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

export function ReportTab() {
  const { inputs, prediction, explanation } = useStore();
  const [schema, setSchema] = useState<FeatureSchema | null>(null);

  useEffect(() => {
    getSchema().then(setSchema);
  }, []);

  if (!prediction) {
    return (
      <Card>
        <h2 className="mb-1 text-[15px] font-semibold tracking-tight">Patient report</h2>
        <p className="text-xs text-foreground/60">
          No report yet. Enter patient details or upload a CSV, then press Predict.
        </p>
      </Card>
    );
  }

  const names = Object.keys(inputs).sort((a, b) =>
    (schema?.features[a]?.label ?? a).localeCompare(schema?.features[b]?.label ?? b),
  );
  const drivers = (explanation?.contributions ?? [])
    .slice()
    .sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value))
    .slice(0, 10);
  const today = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Patient report</h2>
          <p className="tnum mt-0.5 text-xs text-muted">
            {today} · {names.length} values entered
          </p>
        </div>
        <span className="print:hidden">
          <Button variant="ghost" onClick={() => window.print()}>
            Print / Save PDF
          </Button>
        </span>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Overall heart disease risk</h3>
          <Badge tone={prediction.cad.label === 1 ? "high" : "low"}>
            {prediction.cad.label === 1 ? "CAD likely" : "CAD unlikely"}
          </Badge>
        </div>
        <p className="tnum mt-1 text-3xl font-bold">
          {Math.round(prediction.cad.probability * 100)}%
        </p>
        <p className="tnum mt-0.5 text-[11px] text-muted">
          Decide line: {Math.round(prediction.cad.threshold * 100)}% and above counts as likely.
        </p>
      </Card>

      <Card>
        <h3 className="mb-2 text-sm font-medium">Arteries</h3>
        <table className="tnum report-table w-full text-left text-xs">
          <thead>
            <tr className="text-foreground/50">
              <th className="py-1 pr-2 font-medium">Artery</th>
              <th className="py-1 pr-2 font-medium">Territory</th>
              <th className="py-1 pr-2 font-medium">Risk</th>
              <th className="py-1 pr-2 font-medium">Result</th>
              <th className="py-1 font-medium">Decide line</th>
            </tr>
          </thead>
          <tbody>
            {VESSELS.map((v) => {
              const r = prediction.vessels[v];
              const pct = Math.round(r.probability * 100);
              return (
                <tr key={v} className="border-t border-border">
                  <td className="py-1.5 pr-2 font-bold">{v}</td>
                  <td className="py-1.5 pr-2">{ANATOMY_MAP[v]}</td>
                  <td className="py-1.5 pr-2 font-bold">
                    <span
                      aria-hidden
                      className="mr-1.5 inline-block h-2 w-2 rounded-full print:border print:border-black"
                      style={{ background: riskColor(r.probability) }}
                    />
                    {pct}%
                  </td>
                  <td className="py-1.5 pr-2">{r.label === 1 ? "Likely" : "Unlikely"}</td>
                  <td className="py-1.5">{Math.round(r.threshold * 100)}%+</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {drivers.length > 0 && (
        <Card>
          <h3 className="mb-1 text-sm font-medium">What mattered most</h3>
          <p className="mb-2 text-[11px] text-muted">
            Measurements that pushed this patient&apos;s risk up or down, strongest first.
          </p>
          <table className="tnum report-table w-full text-left text-xs">
            <thead>
              <tr className="text-foreground/50">
                <th className="py-1 pr-2 font-medium">#</th>
                <th className="py-1 pr-2 font-medium">Measure</th>
                <th className="py-1 pr-2 font-medium">Value</th>
                <th className="py-1 font-medium">Effect</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d, i) => (
                <tr key={d.feature} className="border-t border-border">
                  <td className="py-1.5 pr-2 text-muted">{i + 1}</td>
                  <td className="py-1.5 pr-2">{d.label}</td>
                  <td className="py-1.5 pr-2">
                    {String(d.value)}
                    {d.unit ? ` ${d.unit}` : ""}
                  </td>
                  <td className="py-1.5 font-semibold">
                    {d.direction === "increases" ? "Raised risk" : "Lowered risk"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {schema && names.length > 0 && (
        <Card>
          <h3 className="mb-1 text-sm font-medium">All entered measurements</h3>
          <p className="mb-2 text-[11px] text-muted">
            Every value on file, against its normal range.
          </p>
          <table className="tnum report-table w-full text-left text-xs">
            <thead>
              <tr className="text-foreground/50">
                <th className="py-1 pr-2 font-medium">Measure</th>
                <th className="py-1 pr-2 font-medium">Value</th>
                <th className="py-1 pr-2 font-medium">Normal</th>
                <th className="py-1 font-medium">Signal</th>
              </tr>
            </thead>
            <tbody>
              {names.map((n) => {
                const meta = schema.features[n];
                if (!meta) return null;
                const v = inputs[n];
                const flag = typeof v === "number" ? outOfRange(meta.normal, v) : false;
                return (
                  <tr key={n} className="border-t border-border">
                    <td className="py-1.5 pr-2">{meta.label}</td>
                    <td className="py-1.5 pr-2 font-semibold">
                      {fmt(v)}
                      {meta.unit ? ` ${meta.unit}` : ""}
                    </td>
                    <td className="py-1.5 pr-2 text-foreground/50">{meta.normal ?? "—"}</td>
                    <td className="py-1.5">{flag ? "Out of range" : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <p className="rounded-lg border border-border-soft p-3 text-[11px] leading-relaxed text-muted">
        For decision support and educational purposes only. Not a substitute for
        formal diagnostic imaging or clinical judgment. Artery colors and widths
        in the 3D view show predicted risk per artery — schematic, not a scan.
      </p>
    </div>
  );
}
