"use client";
/** Physiological measurements table (works NOW, no model needed): every
 *  entered value with its normal range, out-of-range flags, and a
 *  contribution column that activates once SHAP is live.
 */
import { useEffect, useState } from "react";
import { getSchema } from "@/lib/api";
import type { FeatureSchema } from "@/lib/types";
import { useStore } from "@/store/VesselVisionContext";
import { Card } from "../ui";

/** Shared range check: hints look like "< 120", ">= 55", "70-100". Exported
 *  for the theatre sidebar's live blood-numbers strip. */
export function outOfRange(hint: string | null, value: number): boolean {
  if (hint === null) return false;
  // Parse hints like "< 120", ">= 55", "70-100", "4500-11000".
  const lt = hint.match(/^<\s*([\d.]+)/);
  if (lt) return !(value < Number(lt[1]));
  const gte = hint.match(/^>=\s*([\d.]+)/);
  if (gte) return !(value >= Number(gte[1]));
  const range = hint.match(/^([\d.]+)\s*-\s*([\d.]+)/);
  if (range) return !(value >= Number(range[1]) && value <= Number(range[2]));
  return false;
}

export function MeasurementsTable() {
  const { inputs, explanation } = useStore();
  const [schema, setSchema] = useState<FeatureSchema | null>(null);
  useEffect(() => {
    getSchema().then(setSchema);
  }, []);

  const shapByFeature = new Map(
    (explanation?.contributions ?? []).map((c) => [c.feature, c.shap_value]),
  );
  const names = Object.keys(inputs);
  if (names.length === 0 || !schema) return null;

  return (
    <Card>
      <h3 className="mb-2 text-sm font-medium">Measurements</h3>
      <table className="tnum w-full text-left text-xs">
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
            const shap = shapByFeature.get(n);
            return (
              <tr key={n} className="border-t border-border">
                <td className="py-1 pr-2">{meta.label}</td>
                <td className="py-1 pr-2">
                  {String(v)}{meta.unit ? ` ${meta.unit}` : ""}
                </td>
                <td className="py-1 pr-2 text-foreground/50">{meta.normal ?? "—"}</td>
                <td className="py-1 text-foreground/60">
                  {flag
                    ? "out of range"
                    : shap !== undefined
                      ? `${shap >= 0 ? "raises" : "lowers"} risk (${shap >= 0 ? "+" : ""}${shap.toFixed(2)})`
                      : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
