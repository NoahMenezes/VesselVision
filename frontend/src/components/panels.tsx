"use client";
import { Card } from "./ui";
import { CsvUpload } from "./CsvUpload";
import { PatientForm } from "./PatientForm";
import { WhatIf } from "./WhatIf";
import { usePrediction } from "@/hooks/usePrediction";
import { MeasurementsTable } from "./dashboard/MeasurementsTable";
import { PerformanceTab } from "./dashboard/PerformanceTab";
import { ShapPanel } from "./dashboard/ShapPanel";
import { SummaryCard } from "./dashboard/SummaryCard";
import { VesselCards } from "./dashboard/VesselCards";
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

/** Phase 12: clinical dashboard. Each piece reads the store and degrades
 *  honestly pre-training (empty states, never fake numbers). */
export function ResultsPanel() {
  const { prediction, loading, error, inputs, setSelected } = useStore();
  const { predictNow } = usePrediction();
  const showEmpty = !prediction && !loading;
  return (
    <div className="space-y-3">
      {showEmpty ? (
        <Card>
          <h2 className="mb-1 font-medium">Results</h2>
          <div className="rounded-xl border border-dashed border-border p-4 text-xs text-foreground/60">
            <p className="font-medium text-foreground">No prediction yet.</p>
            <p className="mt-1">
              Fill the form or load an example patient, then press Predict.
              Every number here will come from the API.
            </p>
            {error ? <p className="mt-2 text-risk-moderate">{error}</p> : null}
          </div>
        </Card>
      ) : (
        <>
          <SummaryCard onSelect={(t) => setSelected(t)} />
          <VesselCards />
          <WhatIf />
          <ShapPanel />
          {error ? (
            <Card>
              <p className="text-xs text-risk-moderate">{error}</p>
              <button
                type="button"
                onClick={() => void predictNow(inputs)}
                className="mt-2 rounded border border-border px-3 py-1 text-xs hover:bg-black/[0.04]"
              >
                Retry
              </button>
            </Card>
          ) : null}
        </>
      )}
      <MeasurementsTable />
      <PerformanceTab />
    </div>
  );
}
