"use client";
/** CSV upload (Phase 9): drag-and-drop via papaparse, header validation
 *  against GET /schema, 5-row preview, click-a-row to load into the form,
 *  friendly error lists, downloadable CSV template.
 */
import { useRef, useState } from "react";
import Papa from "papaparse";
import { getSchema } from "@/lib/api";
import { useStore } from "@/store/VesselVisionContext";
import { Button, Card } from "./ui";

interface Parsed {
  headers: string[];
  rows: Record<string, string>[];
  errors: string[];
  unknown: string[];
}

export function CsvUpload() {
  const { setInputs, setError } = useStore();
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = async () => {
    const schema = await getSchema();
    if (!schema) {
      setError("Backend offline. Cannot build the CSV template.");
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
      setError("Backend offline. Cannot validate the CSV.");
      return;
    }
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
          errs.push(`${missing.length} schema fields absent. They will use training medians.`);
        }
        const rows = (res.data as Record<string, string>[]).slice(0, 200);
        setParsed({ headers, rows, errors: errs, unknown });
      },
      error: (e) => setParsed({ headers: [], rows: [], errors: [e.message], unknown: [] }),
    });
  };

  const loadRow = (row: Record<string, string>) => {
    const inputs: Record<string, number | string> = {};
    for (const [k, v] of Object.entries(row)) {
      const key = k.trim().toLowerCase();
      if (v === "" || v == null) continue;
      const num = Number(v);
      inputs[key] = Number.isNaN(num) ? v : num;
    }
    setInputs(inputs);
    setError(null);
  };

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-medium">CSV upload</h2>
        <Button variant="ghost" onClick={() => void downloadTemplate()}>Template</Button>
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
                {parsed.rows.length} rows. Click one to load it into the form:
              </p>
              <div className="max-h-40 overflow-auto rounded-lg border border-border">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr>{parsed.headers.slice(0, 6).map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 5).map((r, i) => (
                      <tr key={i} className="cursor-pointer hover:bg-black/[0.04]" onClick={() => loadRow(r)}>
                        {parsed.headers.slice(0, 6).map((h) => <td key={h} className="px-2 py-1">{r[h]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
