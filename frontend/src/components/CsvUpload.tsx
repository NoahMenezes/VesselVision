"use client";
/** CSV upload (Phase 9): drag-and-drop via papaparse, header validation
 *  against GET /schema, 5-row preview, click-a-row to load into the form,
 *  friendly error lists, downloadable CSV template.
 */
import { useRef, useState } from "react";
import Papa from "papaparse";
import { getSchema, postBatch } from "@/lib/api";
import type { BatchRowResult } from "@/lib/types";
import { useStore } from "@/store/VesselVisionContext";
import { usePrediction } from "@/hooks/usePrediction";
import { Button } from "./ui";

interface Parsed {
  headers: string[];
  rows: Record<string, string>[];
  errors: string[];
  unknown: string[];
}

export function CsvUpload() {
  const { inputs, setInputs, setPrediction, setExplanation, setError, loading, error } = useStore();
  const { predictNow } = usePrediction();
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [loaded, setLoaded] = useState<number | null>(null);
  const [upload, setUpload] = useState<File | null>(null);
  const [scores, setScores] = useState<BatchRowResult[] | null>(null);
  const [scoring, setScoring] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = async () => {
    const schema = await getSchema();
    if (!schema) {
      setError("Not connected. Try downloading the template again in a moment.");
      return;
    }
    const blob = new Blob([Object.keys(schema.features).join(",") + "\n"], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vesselvision_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    const schema = await getSchema();
    if (!schema) {
      setError("Not connected. Try uploading the CSV again in a moment.");
      return;
    }
    setUpload(file);
    setScores(null);
    const known = new Set(Object.keys(schema.features));
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const headers = res.meta.fields ?? [];
        const unknown = headers.filter((h) => !known.has(h.trim().toLowerCase()));
        const errs: string[] = [];
        if (headers.length === 0) errs.push("No header row found.");
        if (unknown.length > 0) errs.push(`Unknown columns: ${unknown.join(", ")}. See GET /schema.`);
        const missing = [...known].filter(
          (k) => !headers.map((h) => h.trim().toLowerCase()).includes(k),
        );
        if (missing.length > 0) {
          errs.push(`${missing.length} schema fields absent. They will use typical values.`);
        }
        const rows = (res.data as Record<string, string>[]).slice(0, 200);
        setParsed({ headers, rows, errors: errs, unknown });
        setLoaded(null);
      },
      error: (e) => setParsed({ headers: [], rows: [], errors: [e.message], unknown: [] }),
    });
  };

  const scoreAll = async () => {
    if (!upload || scoring) return;
    setScoring(true);
    const res = await postBatch(upload);
    setScoring(false);
    if (!res) {
      setError("Couldn't score the file. Try again in a moment.");
      return;
    }
    setScores(res);
    setError(null);
  };

  const loadRow = (row: Record<string, string>, index: number) => {
    const next: Record<string, number | string> = {};
    for (const [k, v] of Object.entries(row)) {
      const key = k.trim().toLowerCase();
      if (v === "" || v == null) continue;
      const num = Number(v);
      next[key] = Number.isNaN(num) ? v : num;
    }
    setInputs(next);
    setError(null);
    setLoaded(index);
  };

  return (
    <details className="rounded-lg border border-border bg-surface">
      <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-medium">
        CSV upload <span className="font-normal text-muted">— batch rows, optional</span>
      </summary>
      <div className="px-4 pb-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs text-muted">Drop a file, pick a row to load it.</p>
        <span className="flex shrink-0 gap-1.5">
          <a
            href="/patients.csv"
            download="patients.csv"
            className="rounded px-2.5 py-1 text-xs font-semibold border border-border bg-surface text-foreground hover:bg-surface-soft"
          >
            Sample file
          </a>
          <Button size="sm" variant="ghost" onClick={() => void downloadTemplate()}>Template</Button>
        </span>
      </div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop a CSV file here or activate to browse"
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter") fileRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files[0];
          if (f) void handleFile(f);
        }}
        className={`rounded-lg border border-dashed p-4 text-center text-xs ${drag ? "border-accent" : "border-border text-foreground/60"}`}
      >
        Drop a CSV here or click to browse (max 200 rows)
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </div>
      {parsed && (
        <div className="mt-2 text-xs">
          {parsed.errors.length > 0 && (
            <ul className="mb-2 space-y-1 text-risk-moderate">
              {parsed.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          {parsed.rows.length > 0 && (
            <>
              <p className="mb-1 text-foreground/60">
                {parsed.rows.length} rows. Click one to load it, then press Predict:
              </p>
              <div className="max-h-40 overflow-auto rounded-lg border border-border">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr>{parsed.headers.slice(0, 6).map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 5).map((r, i) => (
                      <tr
                        key={i}
                        tabIndex={0}
                        aria-label={`Load row ${i + 1} into the form`}
                        className={`cursor-pointer ${loaded === i ? "bg-accent/10 font-semibold" : "hover:bg-black/[0.04] dark:hover:bg-white/[0.07]"}`}
                        onClick={() => loadRow(r, i)}
                        onKeyDown={(e) => { if (e.key === "Enter") loadRow(r, i); }}
                      >
                        {parsed.headers.slice(0, 6).map((h) => <td key={h} className="px-2 py-1">{r[h]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {scores && parsed && (
                <ul className="mt-2 space-y-1">
                  {scores.slice(0, 5).map((s) => (
                    <li key={s.row}>
                      <button
                        type="button"
                        onClick={() => {
                          const r = parsed.rows[s.row];
                          if (r) loadRow(r, s.row);
                        }}
                        className="tnum flex w-full items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5 text-left text-[11px] hover:bg-black/[0.04] dark:hover:bg-white/[0.07]"
                      >
                        <span className="font-semibold">Row {s.row + 1}</span>
                        {s.prediction ? (
                          <span>
                            <span className="font-bold">
                              {Math.round(s.prediction.cad.probability * 100)}%
                            </span>{" "}
                            <span className="text-foreground/60">CAD</span>
                          </span>
                        ) : (
                          <span className="text-risk-moderate">
                            {s.errors[0] ?? "Couldn't score"}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => void predictNow(inputs)}
                  disabled={loading || loaded === null || Object.keys(inputs).length === 0}
                >
                  {loading ? "Scoring…" : loaded === null ? "Predict" : `Predict row ${loaded + 1}`}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void scoreAll()}
                  disabled={scoring || !upload}
                >
                  {scoring ? "Scoring…" : "Score all"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setParsed(null);
                    setLoaded(null);
                    setUpload(null);
                    setScores(null);
                    setInputs({});
                    setPrediction(null);
                    setExplanation(null);
                    setError(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  Remove
                </Button>
                <p className="text-[11px] text-foreground/50">
                  {error
                    ? <span className="text-risk-moderate">{error}</span>
                    : loaded === null
                      ? "Pick a row above to enable Predict."
                      : "Row loaded — results appear under Risk, colors on the Heart."}
                </p>
              </div>
            </>
          )}
        </div>
      )}
      </div>
    </details>
  );
}
