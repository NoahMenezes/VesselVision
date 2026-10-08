"use client";
/** What-if mode (Phase 13): tweak one numeric feature by -50%..+50% and see
 *  the live change in CAD probability with a before/after delta. Read-only
 *  preview (never touches the form); degrades to guidance while untrained.
 */
import { useState } from "react";
import { getSchema, postPredict } from "@/lib/api";
import type { FeatureSchema } from "@/lib/types";
import { useStore } from "@/store/VesselVisionContext";
import { Button, Card } from "./ui";

export function WhatIf() {
  const { inputs, prediction } = useStore();
  const [schema, setSchema] = useState<FeatureSchema | null>(null);
  const [field, setField] = useState("");
  const [delta, setDelta] = useState(0);
  const [after, setAfter] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const openPicker = async () => {
    if (!schema) setSchema(await getSchema());
  };

  const numerics = schema
    ? Object.keys(schema.features).filter((n) => schema.features[n].kind === "numeric")
    : [];
  const baseVal = field ? inputs[field] : undefined;
  const tweaked =
    typeof baseVal === "number" ? Math.round(baseVal * (1 + delta / 100) * 100) / 100 : null;

  const run = async () => {
    if (field === "" || tweaked === null) return;
    setBusy(true);
    setNote(null);
    const pred = await postPredict({ ...inputs, [field]: tweaked });
    setBusy(false);
    if (!pred) {
      setNote("What-if needs trained models (see docs/PHASE4_REMAINING.md).");
      setAfter(null);
      return;
    }
    setAfter(pred.cad.probability);
  };

  const before = prediction?.cad.probability ?? null;

  return (
    <Card>
      <h3 className="mb-1 text-sm font-medium">What-if</h3>
      <p className="mb-2 text-xs text-foreground/60">
        Change one measurement and preview the effect on CAD probability.
      </p>
      <label className="block text-xs" onFocus={() => void openPicker()}>
        Feature
        <select
          className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm"
          value={field}
          onChange={(e) => {
            setField(e.target.value);
            setAfter(null);
          }}
          onFocus={() => void openPicker()}
        >
          <option value="">Select a measurement...</option>
          {numerics.map((n) => (
            <option key={n} value={n}>
              {schema?.features[n].label}
            </option>
          ))}
        </select>
      </label>
      {typeof baseVal === "number" ? (
        <>
          <label className="tnum mt-2 block text-xs">
            Adjust: {delta > 0 ? "+" : ""}{delta}% (now {String(baseVal)}, trial {String(tweaked)})
            <input
              type="range"
              min={-50}
              max={50}
              value={delta}
              onChange={(e) => setDelta(Number(e.target.value))}
              className="mt-1 w-full"
              aria-label="Relative change percent"
            />
          </label>
          <div className="mt-2">
            <Button onClick={() => void run()} disabled={busy}>
              {busy ? "Scoring…" : "Preview effect"}
            </Button>
          </div>
        </>
      ) : (
        <p className="mt-2 text-xs text-foreground/50">
          Pick a measurement with a value already entered in the form.
        </p>
      )}
      {note ? <p className="mt-2 text-xs text-risk-moderate">{note}</p> : null}
      {before !== null && after !== null ? (
        <p className="tnum mt-2 text-xs">
          {Math.round(before * 100)}% → {Math.round(after * 100)}% (
          {after >= before ? "+" : ""}{Math.round((after - before) * 100)} pts)
        </p>
      ) : null}
    </Card>
  );
}
