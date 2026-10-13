"use client";
/** Printable patient report: overall score, per-artery bars, what mattered
 *  most, and the safety note. Print (or save-as-PDF) via the button; the
 *  print stylesheet strips nav, forms, and toolbars automatically.
 */
import { ANATOMY_MAP, riskColor } from "@/lib/arteries";
import type { VesselKey } from "@/lib/types";
import { useStore } from "@/store/VesselVisionContext";
import { Badge, Button, Card } from "../ui";

const VESSELS: VesselKey[] = ["LAD", "LCX", "RCA"];

export function ReportTab() {
  const { inputs, prediction, explanation } = useStore();

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

  const filled = Object.keys(inputs).length;
  const drivers = (explanation?.contributions ?? [])
    .slice()
    .sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value))
    .slice(0, 8);
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
            {today} · {filled} values entered
          </p>
        </div>
        <Button variant="ghost" onClick={() => window.print()}>
          Print / Save PDF
        </Button>
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
      </Card>

      <Card>
        <h3 className="mb-2 text-sm font-medium">Arteries</h3>
        <div className="space-y-2.5">
          {VESSELS.map((v) => {
            const p = prediction.vessels[v].probability;
            return (
              <div key={v}>
                <div className="tnum flex items-baseline justify-between text-xs">
                  <span className="font-semibold">
                    {v} <span className="font-normal text-muted">({ANATOMY_MAP[v]})</span>
                  </span>
                  <span className="font-bold">{Math.round(p * 100)}%</span>
                </div>
                <div
                  role="img"
                  aria-label={`${v} risk ${Math.round(p * 100)} percent`}
                  className="mt-1 h-2 overflow-hidden rounded-full bg-surface-soft"
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.round(p * 100)}%`, background: riskColor(p) }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {drivers.length > 0 && (
        <Card>
          <h3 className="mb-1 text-sm font-medium">What mattered most</h3>
          <ul className="tnum space-y-1.5 text-xs">
            {drivers.map((d) => (
              <li key={d.feature} className="flex justify-between gap-3 border-t border-border-soft pt-1.5">
                <span>
                  {d.label}{" "}
                  <span className="text-muted">
                    ({String(d.value)}{d.unit ? ` ${d.unit}` : ""})
                  </span>
                </span>
                <span className="shrink-0 font-semibold">
                  {d.direction === "increases" ? "raised risk" : "lowered risk"}
                </span>
              </li>
            ))}
          </ul>
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
