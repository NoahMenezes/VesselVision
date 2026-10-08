"use client";
import { Card, Skeleton } from "./ui";
import { CsvUpload } from "./CsvUpload";
import { PatientForm } from "./PatientForm";
import { HeartCanvas } from "./heart/HeartCanvas";
import { Schematic2D } from "./heart/VesselLegend";
import { useStore } from "@/store/VesselVisionContext";

/** Phase 9: schema-driven form + samples + CSV upload (live against /schema). */
export function InputPanel() {
  return (
    <div className="space-y-3">
      <PatientForm />
      <CsvUpload />
    </div>
  );
}

/** Phase 10: live 3D heart (GLB myocardium + separate LAD/LCX/RCA tubes).
 *  Probability colors + pulse arrive in Phase 11. */
export function HeartPanel() {
  return (
    <Card className="flex min-h-80 flex-col">
      <h2 className="mb-1 font-medium">3D heart</h2>
      <p className="mb-3 text-xs text-foreground/60">
        Rotate and zoom. Arteries recolor green to red by predicted
        stenosis probability; click a vessel to inspect it.
      </p>
      <HeartCanvas />
      <Schematic2D />
    </Card>
  );
}

/** Phase 12 builds gauges, vessel cards, SHAP chart, and report export here.
 *  Until the first prediction exists, a composed empty state (not blank,
 *  not fake numbers); skeletons only while loading. */
export function ResultsPanel() {
  const { prediction, loading, error } = useStore();
  return (
    <Card>
      <h2 className="mb-1 font-medium">Results</h2>
      {loading && !prediction ? (
        <>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="mt-2 h-16 w-full" />
        </>
      ) : prediction ? (
        <p className="tnum text-xs text-foreground/60">
          Prediction received. Gauges, vessel cards, and SHAP breakdown land here in Phase 12.
        </p>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-4 text-xs text-foreground/60">
          <p className="font-medium text-foreground">No prediction yet.</p>
          <p className="mt-1">
            Fill the form or load an example patient, then press Predict.
            Every number here will come from the API.
          </p>
          {error ? <p className="mt-2 text-risk-moderate">{error}</p> : null}
        </div>
      )}
    </Card>
  );
}
