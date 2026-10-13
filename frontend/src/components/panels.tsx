"use client";
import { Card } from "./ui";
import { CsvUpload } from "./CsvUpload";
import { PatientForm } from "./PatientForm";
import { WhatIf } from "./WhatIf";
import { usePrediction } from "@/hooks/usePrediction";
import { MeasurementsTable } from "./dashboard/MeasurementsTable";
import { ShapPanel } from "./dashboard/ShapPanel";
import { SummaryCard } from "./dashboard/SummaryCard";
import { VesselCards } from "./dashboard/VesselCards";
import { HeartCanvas } from "./heart/HeartCanvas";
import { CanvasErrorBoundary } from "./heart/ErrorBoundary";
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
 *  Probability colors + pulse arrive in Phase 11. The 2D vessel picker lives
 *  inside the expanded theatre view, not below the canvas. */
export function HeartPanel() {
  return (
    <div className="space-y-3">
      <Card className="flex min-h-80 flex-col">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-semibold tracking-tight">3D heart</h2>
          <p className="shrink-0 text-xs text-muted">⤢ Expand for a better view</p>
        </div>
        <CanvasErrorBoundary>
          <HeartCanvas />
        </CanvasErrorBoundary>
      </Card>
      <MeasurementsTable />
    </div>
  );
}

/** Start-of-flow strip: 1 → 2 → 3. Step 1 is live; steps 2 and 3 unlock
 *  on the first prediction, when the full three-column view returns. */
export function StepStrip() {
  const steps = [
    { n: 1, label: "Patient data", live: true },
    { n: 2, label: "3D heart", live: false },
    { n: 3, label: "Risk results", live: false },
  ];
  return (
    <div>
      <ol aria-label="Steps" className="flex items-center justify-center gap-2 sm:gap-3">
        {steps.map((s, i) => (
          <li key={s.n} className="flex items-center gap-2 sm:gap-3">
            {i > 0 && (
              <span aria-hidden className="text-sm font-bold text-border">
                →
              </span>
            )}
            <span
              aria-hidden
              className={
                s.live
                  ? "tnum flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background"
                  : "tnum flex h-7 w-7 items-center justify-center rounded-full border border-border text-xs font-bold text-muted"
              }
            >
              {s.n}
            </span>
            <span className={s.live ? "text-sm font-semibold text-foreground" : "text-sm text-muted"}>
              {s.label}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-center text-xs text-muted">
        Enter details or upload a CSV, then press Predict — steps 2 and 3 unlock.
      </p>
    </div>
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
              Every number here is computed from the patient&apos;s data.
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
                className="mt-2 rounded border border-border px-3 py-1 text-xs hover:bg-black/[0.04] dark:hover:bg-white/[0.07]"
              >
                Retry
              </button>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
