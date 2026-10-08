"use client";
/** Schema-driven patient form (Phase 9). Sections come from GET /schema
 *  groups; every field shows unit + normal-range hint and a glossary tooltip
 *  where one exists. Samples + reset + manual Predict included.
 */
import { useEffect, useState } from "react";
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

function FieldRow({ name, field, value, onChange }: {
  name: string;
  field: SchemaField;
  value: number | string | undefined;
  onChange: (v: number | string) => void;
}) {
  const label = (
    <span className="text-xs">
      {field.label}
      {field.unit ? <span className="text-foreground/50"> ({field.unit})</span> : null}
    </span>
  );
  const hint = field.normal ? (
    <span className="block text-[11px] text-foreground/50">Typical: {field.normal}</span>
  ) : null;
  const tip = GLOSSARY[name];
  const head = tip ? <Tooltip tip={tip}>{label}</Tooltip> : label;

  if (name === "sex") {
    return (
      <label className="block">
        {head}
        <span className="mt-1 flex gap-1">
          {(["Female", "Male"] as const).map((opt) => (
            <Button
              key={opt}
              type="button"
              variant={value === opt ? "primary" : "ghost"}
              onClick={() => onChange(opt)}
              aria-pressed={value === opt}
            >
              {opt}
            </Button>
          ))}
        </span>
        {hint}
      </label>
    );
  }
  if (field.kind === "binary") {
    const cur = value === 1 || value === "Y" ? 1 : value === 0 || value === "N" ? 0 : undefined;
    return (
      <label className="block">
        {head}
        <span className="mt-1 flex gap-1">
          {([["No", 0], ["Yes", 1]] as const).map(([txt, v]) => (
            <Button
              key={txt}
              type="button"
              variant={cur === v ? "primary" : "ghost"}
              onClick={() => onChange(v)}
              aria-pressed={cur === v}
            >
              {txt}
            </Button>
          ))}
        </span>
        {hint}
      </label>
    );
  }
  if (name === "bbb") {
    return (
      <label className="block">
        {head}
        <select
          className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select...</option>
          {BBB_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        {hint}
      </label>
    );
  }
  if (name === "vhd") {
    return (
      <label className="block">
        {head}
        <select
          className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm"
          value={value === undefined || value === "" ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        >
          <option value="">Select...</option>
          {VHD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {hint}
      </label>
    );
  }
  return (
    <label className="block">
      {head}
      <input
        type="number"
        className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm"
        value={value ?? ""}
        placeholder={field.normal ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      />
      {hint}
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
          Loading the field schema from the backend… start it with <code>make backend</code>.
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
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-medium">Patient input</h2>
        <Badge tone="neutral">{filled}/{names.length} fields</Badge>
      </div>

      <label className="mb-2 block text-xs">
        Find a field
        <input
          type="search"
          placeholder="e.g. cholesterol, smoking, ECG…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm"
        />
      </label>

      <label className="mb-2 block text-xs">
        Load example patient
        <select
          className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-sm"
          defaultValue=""
          onChange={(e) => {
            const s = samples.find((x) => x.id === e.target.value);
            if (s) {
              setInputs({ ...s.inputs });
              setError(null);
            }
          }}
        >
          <option value="">Select a patient...</option>
          {samples.map((s) => <option key={s.id} value={s.id}>{s.description}</option>)}
        </select>
      </label>

      {GROUP_ORDER.map((group) => {
        const fields = orderFields(
          names.filter((n) => schema.features[n].group === group && matches(n)),
          group,
        );
        if (fields.length === 0) return null;
        const isOpen = open[group] ?? false;
        return (
          <details
            key={group}
            open={isOpen}
            onToggle={(e) => setOpen((o) => ({ ...o, [group]: (e.target as HTMLDetailsElement).open }))}
            className="mb-2 rounded-lg border border-border"
          >
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
              {GROUP_TITLES[group] ?? group}
              <span className="ml-2 text-xs text-foreground/50">
                {fields.filter((f) => inputs[f] !== undefined).length}/{fields.length}
              </span>
            </summary>
            <div className="space-y-3 px-3 pb-3">
              {fields.map((n) => (
                <FieldRow key={n} name={n} field={schema.features[n]} value={inputs[n]} onChange={(v) => set(n, v)} />
              ))}
            </div>
          </details>
        );
      })}

      <div className="mt-2 flex gap-2">
        <Button
          onClick={() => void predictNow(inputs)}
          disabled={loading || filled === 0}
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
      <p className="mt-2 text-[11px] text-foreground/50">
        Fills in automatically about half a second after you stop typing. Empty fields use typical values.
      </p>
    </Card>
  );
}
