import { Card, Skeleton } from "./ui";
import { CsvUpload } from "./CsvUpload";
import { PatientForm } from "./PatientForm";

/** Phase 9: schema-driven form + samples + CSV upload (live against /schema). */
export function InputPanel() {
  return (
    <div className="space-y-3">
      <PatientForm />
      <CsvUpload />
    </div>
  );
}

/** Phase 10 mounts the R3F HeartScene here (dynamic import, ssr:false). */
export function HeartPanel() {
  return (
    <Card className="flex min-h-80 flex-col">
      <h2 className="mb-1 font-medium">3D heart</h2>
      <p className="mb-3 text-xs text-foreground/60">
        Step 2 of 3: rotate and zoom. Arteries recolor green to red by predicted
        stenosis probability; click a vessel to inspect it.
      </p>
      <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border text-sm text-foreground/50">
        Heart canvas loads here (Phase 10)
      </div>
    </Card>
  );
}

/** Phase 12 builds gauges, vessel cards, SHAP chart, and report export here. */
export function ResultsPanel() {
  return (
    <Card>
      <h2 className="mb-1 font-medium">Results</h2>
      <p className="mb-3 text-xs text-foreground/60">
        Step 3 of 3: overall CAD status, per-vessel risk, and what drove the
        prediction. Every number will come from the API.
      </p>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="mt-2 h-16 w-full" />
    </Card>
  );
}
