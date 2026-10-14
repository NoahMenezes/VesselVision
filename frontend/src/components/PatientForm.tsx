"use client";
/** Schema-driven patient form (Phase 9). Sections come from GET /schema
 *  groups; every field shows unit + normal-range hint and a glossary tooltip
 *  where one exists. Samples + reset + manual Predict included.
 *
 *  Layout: single-column rows (label on top, full-width control below).
 *  The input panel is only ~320px wide, so side-by-side label+control pairs
 *  wrapped mid-word and overlapped. One column never collides at any width.
 */
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { getSamples, getSchema } from "@/lib/api";
import { GLOSSARY } from "@/lib/glossary";
import type { FeatureSchema, SamplePatient, SchemaField } from "@/lib/types";
import { useStore } from "@/store/VesselVisionContext";
import { usePrediction } from "@/hooks/usePrediction";
import { Badge, Button, Card, Tooltip } from "./ui";

const GROUP_TITLES: Record<string, string> = {
  demographic: "Demographics & history",
  symptom_exam: "Symptoms & examination",
  ecg: "ECG",
  lab_echo: "Labs & echo",
};
const GROUP_ORDER = ["demographic", "symptom_exam", "ecg", "lab_echo"];

/** Encounter-flow ordering within each group: presenting complaint and vitals
 *  first, history checkboxes last. Unlisted fields follow alphabetically. */
const GROUP_PRIORITY: Record<string, string[]> = {
  demographic: ["age", "sex", "weight", "length", "bmi", "current_smoker", "ex_smoker"],
  symptom_exam: [
    "typical_chest_pain", "atypical", "nonanginal", "dyspnea", "bp", "pr",
    "edema", "function_class", "lowth_ang",
  ],
  ecg: ["st_elevation", "st_depression", "tinversion", "q_wave", "lvh", "bbb"],
  lab_echo: ["ldl", "hdl", "tg", "fbs", "ef_tte", "region_rwma", "vhd"],
};

function orderFields(fields: string[], group: string): string[] {
  const prio = GROUP_PRIORITY[group] ?? [];
  const rank = new Map(prio.map((n, i) => [n, i]));
  return fields.slice().sort((a, b) => (rank.get(a) ?? 999) - (rank.get(b) ?? 999));
}

const BBB_OPTIONS = ["N", "LBBB", "RBBB"];
const VHD_OPTIONS = [
  { value: 0, label: "None" },
  { value: 1, label: "mild" },
  { value: 2, label: "Moderate" },
  { value: 3, label: "Severe" },
];

const inputCls =
  "mt-1.5 block w-full min-w-0 rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-foreground/30";

function FieldLabel({ name, field }: { name: string; field: SchemaField }) {
  const label = (
    <span className="text-[13px] font-medium leading-snug">
      {field.label}
      {field.unit ? <span className="font-normal text-foreground/50"> · {field.unit}</span> : null}
    </span>
  );
  const tip = GLOSSARY[name];
  return tip ? <Tooltip tip={tip}>{label}</Tooltip> : label;
}

/** Full-width two-option segmented control. Never wraps, never overflows. */
function Segmented({
  options,
  value,
  onPick,
  labels,
}: {
  options: readonly (number | string)[];
  value: number | string | undefined;
  onPick: (v: number | string) => void;
  labels: readonly [string, string];
}) {
  return (
    <span
      role="group"
      className="mt-1.5 flex rounded-lg border border-border bg-surface-soft p-1"
    >
      {options.map((opt, i) => {
        const active = value === opt;
        return (
          <button
            key={String(opt)}
            type="button"
            aria-pressed={active}
            onClick={() => onPick(opt)}
            className={`flex-1 rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${
              active
                ? "bg-foreground text-background shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            {labels[i]}
          </button>
        );
      })}
    </span>
  );
}

function FieldRow({ name, field, value, onChange }: {
  name: string;
  field: SchemaField;
  value: number | string | undefined;
  onChange: (v: number | string) => void;
}) {
  if (name === "sex") {
    return (
      <div>
        <FieldLabel name={name} field={field} />
        <Segmented
          options={["Female", "Male"] as const}
          value={typeof value === "string" ? value : undefined}
          onPick={onChange}
          labels={["Female", "Male"] as const}
        />
      </div>
    );
  }
  if (field.kind === "binary") {
    const cur = value === 1 || value === "Y" ? 1 : value === 0 || value === "N" ? 0 : undefined;
    return (
      <div>
        <FieldLabel name={name} field={field} />
        <Segmented
          options={[0, 1] as const}
          value={cur}
          onPick={onChange}
          labels={["No", "Yes"] as const}
        />
      </div>
    );
  }
  if (name === "bbb") {
    return (
      <label className="block">
        <FieldLabel name={name} field={field} />
        <select
          className={inputCls}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select…</option>
          {BBB_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </label>
    );
  }
  if (name === "vhd") {
    return (
      <label className="block">
        <FieldLabel name={name} field={field} />
        <select
          className={inputCls}
          value={value === undefined || value === "" ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        >
          <option value="">Select…</option>
          {VHD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
    );
  }
  return (
    <label className="block">
      <FieldLabel name={name} field={field} />
      <input
        type="number"
        className={`${inputCls} tnum`}
        value={value ?? ""}
        placeholder="Enter value"
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      />
      {field.normal ? (
        <span className="tnum mt-1 block text-[11px] leading-snug text-foreground/50">
          Typical: {field.normal}
        </span>
      ) : null}
    </label>
  );
}

export function PatientForm() {
  const { inputs, setInputs, setPrediction, setExplanation, setError, loading } = useStore();
  const { predictNow } = usePrediction();
  const [schema, setSchema] = useState<FeatureSchema | null>(null);
  const [samples, setSamples] = useState<SamplePatient[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({ demographic: true });
  const [query, setQuery] = useState("");

  useEffect(() => {
    getSchema().then(setSchema);
    getSamples().then(setSamples);
  }, []);

  const set = (name: string, v: number | string) => {
    const next = { ...inputs };
    if (v === "" || v === undefined) delete next[name];
    else next[name] = v;
    setInputs(next);
  };

  if (!schema) {
    return (
      <Card>
        <h2 className="mb-1 font-medium">Patient input</h2>
        <p className="text-xs text-foreground/60">
          Loading the patient form… If this sticks, the app isn&apos;t connected.
        </p>
      </Card>
    );
  }

  const names = Object.keys(schema.features);
  const filled = Object.keys(inputs).length;
  const q = query.trim().toLowerCase();
  const matches = (n: string) =>
    q === "" || schema.features[n].label.toLowerCase().includes(q) || n.includes(q);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">Patient input</h2>
          <p className="mt-0.5 text-xs text-muted">Routine workup — 4 sections, no scans needed.</p>
        </div>
        <Badge tone="neutral">{filled}/{names.length} fields</Badge>
      </div>

      <div className="relative mt-4">
        <label htmlFor="field-search" className="mb-1 block text-xs font-medium text-muted">
          Find a field
        </label>
        <input
          id="field-search"
          type="search"
          placeholder="e.g. cholesterol, smoking, ECG…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={inputCls.replace("mt-1.5", "mt-0 pr-9")}
        />
        {query !== "" && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery("")}
            className="absolute bottom-2 right-2.5 text-sm text-muted hover:text-foreground"
          >
            ✕
          </button>
        )}
      </div>

      <div className="mt-3">
        <label htmlFor="example-patient" className="mb-1 block text-xs font-medium text-muted">
          Load example patient
        </label>
        <select
          id="example-patient"
          className={inputCls.replace("mt-1.5", "mt-0")}
          defaultValue=""
          onChange={(e) => {
            const s = samples.find((x) => x.id === e.target.value);
            if (s) {
              setInputs({ ...s.inputs });
              setError(null);
            }
          }}
        >
          <option value="">Select a patient…</option>
          {samples.map((s) => <option key={s.id} value={s.id}>{s.description}</option>)}
        </select>
      </div>

      <div className="mt-4 space-y-2.5">
        {GROUP_ORDER.map((group) => {
          const fields = orderFields(
            names.filter((n) => schema.features[n].group === group && matches(n)),
            group,
          );
          if (fields.length === 0) return null;
          const isOpen = open[group] ?? false;
          const done = fields.filter((f) => inputs[f] !== undefined).length;
          return (
            <details
              key={group}
              open={isOpen}
              onToggle={(e) => setOpen((o) => ({ ...o, [group]: (e.target as HTMLDetailsElement).open }))}
              className="overflow-hidden rounded-xl border border-border bg-surface"
            >
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <span
                  aria-hidden
                  className={`text-[10px] text-muted transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                >
                  ▶
                </span>
                <span className="flex-1 text-sm font-semibold">
                  {GROUP_TITLES[group] ?? group}
                </span>
                <span className="tnum rounded-full bg-surface-soft px-2 py-0.5 text-[11px] font-medium text-muted">
                  {done}/{fields.length}
                </span>
              </summary>
              <div className="space-y-4 border-t border-border-soft px-4 py-4">
                {fields.map((n) => (
                  <FieldRow key={n} name={n} field={schema.features[n]} value={inputs[n]} onChange={(v) => set(n, v)} />
                ))}
              </div>
            </details>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          className={clsx("flex-1", (loading || filled === 0) && "cursor-not-allowed opacity-50")}
          onClick={() => {
            if (!loading && filled > 0) void predictNow(inputs);
          }}
          aria-disabled={loading || filled === 0}
        >
          {loading ? "Predicting…" : "Predict"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setInputs({});
            setPrediction(null);
            setExplanation(null);
            setError(null);
          }}
        >
          Reset
        </Button>
      </div>
      <p className="mt-2.5 text-[11px] leading-relaxed text-foreground/50">
        Fills in automatically about half a second after you stop typing. Empty fields use typical values.
      </p>
    </Card>
  );
}
