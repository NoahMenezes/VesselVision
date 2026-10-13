"use client";
/** Theatre left rail: live patient values, editable in place.
 *
 *  Edits write straight into the shared store, so the mounted
 *  usePrediction() debounce re-scores (~400ms) and the 3D heart recolors
 *  by itself. Key levers stay pinned on top even when empty; every other
 *  entered value follows below. With no patient loaded, one-click examples.
 */
import { useEffect, useMemo, useState } from "react";
import { getSamples, getSchema } from "@/lib/api";
import { ANATOMY_MAP, riskColor } from "@/lib/arteries";
import type { FeatureSchema, SamplePatient, SelectedTarget } from "@/lib/types";
import { useStore } from "@/store/VesselVisionContext";
import { usePrediction } from "@/hooks/usePrediction";

/** Most influential routine-workup levers: always visible for tweaking. */
const KEY_LEVERS = [
  "age", "sex", "bp", "ldl", "hdl", "tg", "fbs", "ef_tte",
  "typical_chest_pain", "dm", "htn", "current_smoker",
];

const GROUP_ORDER = ["demographic", "symptom_exam", "ecg", "lab_echo"];
const GROUP_TITLES: Record<string, string> = {
  demographic: "Demographics & history",
  symptom_exam: "Symptoms & examination",
  ecg: "ECG",
  lab_echo: "Labs & echo",
};

const darkInput =
  "mt-1 block w-full min-w-0 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white placeholder:text-white/30";

function MiniSegmented({
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
    <span role="group" className="mt-1 flex rounded-md border border-white/10 bg-white/5 p-0.5">
      {options.map((opt, i) => {
        const active = value === opt;
        return (
          <button
            key={String(opt)}
            type="button"
            aria-pressed={active}
            onClick={() => onPick(opt)}
            className={`flex-1 rounded px-2 py-1 text-[11px] font-semibold transition-colors ${
              active ? "bg-white text-black shadow-sm" : "text-white/55 hover:text-white"
            }`}
          >
            {labels[i]}
          </button>
        );
      })}
    </span>
  );
}

function ValueRow({
  name,
  label,
  unit,
  kind,
  value,
  onChange,
}: {
  name: string;
  label: string;
  unit: string | null;
  kind: string;
  value: number | string | undefined;
  onChange: (v: number | string) => void;
}) {
  const head = (
    <span className="block text-[11px] font-medium leading-snug text-white/80">
      {label}
      {unit ? <span className="font-normal text-white/40"> · {unit}</span> : null}
    </span>
  );
  if (name === "sex") {
    const cur = typeof value === "string" ? value : undefined;
    return (
      <div>{head}
        <MiniSegmented options={["Female", "Male"] as const} value={cur} onPick={onChange} labels={["Female", "Male"] as const} />
      </div>
    );
  }
  if (kind === "binary") {
    const cur = value === 1 || value === "Y" ? 1 : value === 0 || value === "N" ? 0 : undefined;
    return (
      <div>{head}
        <MiniSegmented options={[0, 1] as const} value={cur} onPick={onChange} labels={["No", "Yes"] as const} />
      </div>
    );
  }
  if (name === "bbb") {
    return (
      <label className="block">{head}
        <select className={darkInput} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {["N", "LBBB", "RBBB"].map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </label>
    );
  }
  if (name === "vhd") {
    return (
      <label className="block">{head}
        <select
          className={darkInput}
          value={value === undefined || value === "" ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        >
          <option value="">—</option>
          {[["0", "None"], ["1", "mild"], ["2", "Moderate"], ["3", "Severe"]].map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <label className="block">{head}
      <input
        type="number"
        className={`${darkInput} tnum`}
        value={value ?? ""}
        placeholder="—"
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      />
    </label>
  );
}

function RiskReadout({ selected }: { selected: SelectedTarget }) {
  const { prediction } = useStore();
  if (!prediction) {
    return <p className="text-[11px] text-white/40">No prediction yet — enter or load values.</p>;
  }
  const rows: { code: string; prob: number }[] = [
    { code: "CAD", prob: prediction.cad.probability },
  ];
  if (selected !== "CAD") {
    rows.push({ code: selected, prob: prediction.vessels[selected].probability });
  }
  return (
    <div className="flex gap-2">
      {rows.map((r) => (
        <div key={r.code} className="tnum flex-1 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/50">
            <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: riskColor(r.prob) }} />
            {r.code}
          </div>
          <div className="text-base font-bold text-white">{Math.round(r.prob * 100)}%</div>
          {r.code !== "CAD" && (
            <div className="truncate text-[10px] text-white/40">{ANATOMY_MAP[r.code as keyof typeof ANATOMY_MAP]}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export function TheatreSidebar() {
  const { inputs, setInputs, setError, selected } = useStore();
  // Mounted while theatre is open: edits re-score automatically (~400ms).
  usePrediction();
  const [schema, setSchema] = useState<FeatureSchema | null>(null);
  const [samples, setSamples] = useState<SamplePatient[] | null>(null);

  const filled = Object.keys(inputs).length;

  useEffect(() => {
    getSchema().then(setSchema);
    if (filled === 0) getSamples().then(setSamples);
    // Fetch once on open; edits flow through the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (name: string, v: number | string) => {
    const next = { ...inputs };
    if (v === "" || v === undefined) delete next[name];
    else next[name] = v;
    setInputs(next);
  };

  const labelOf = (n: string) => schema?.features[n]?.label ?? n;
  const unitOf = (n: string) => schema?.features[n]?.unit ?? null;
  const kindOf = (n: string): string => {
    if (n === "sex") return "binary";
    if (n === "bbb") return "bbb";
    if (n === "vhd") return "vhd";
    const k = schema?.features[n]?.kind;
    if (k) return k;
    const v = inputs[n];
    return v === 0 || v === 1 ? "binary" : "numeric";
  };

  const loadSample = (which: "high" | "low") => {
    if (!samples || samples.length === 0) return;
    const want = which === "high" ? "high-risk" : "low-risk";
    const s = samples.find((x) => x.description.includes(want)) ?? samples[which === "high" ? 0 : 2] ?? samples[0];
    if (s) {
      setInputs({ ...s.inputs });
      setError(null);
    }
  };

  const groupedRest = useMemo(() => {
    const names = Object.keys(inputs).filter((n) => !KEY_LEVERS.includes(n));
    const groupOf = (n: string) => schema?.features[n]?.group ?? "";
    names.sort(
      (a, b) =>
        GROUP_ORDER.indexOf(groupOf(a)) - GROUP_ORDER.indexOf(groupOf(b)) ||
        a.localeCompare(b),
    );
    const out: { key: string; title: string; names: string[] }[] = [];
    const seen = new Set<string>();
    for (const g of GROUP_ORDER) {
      const inGroup = names.filter((n) => groupOf(n) === g);
      if (inGroup.length > 0) {
        out.push({ key: g, title: GROUP_TITLES[g] ?? g, names: inGroup });
        inGroup.forEach((n) => seen.add(n));
      }
    }
    const other = names.filter((n) => !seen.has(n));
    if (other.length > 0) out.push({ key: "other", title: "Other", names: other });
    return out;
  }, [inputs, schema]);

  return (
    <aside aria-label="Patient values" className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-[#0b0e10] p-4 shadow-2xl shadow-black/60">
        <div className="flex shrink-0 items-center justify-between gap-2">
          <h3 className="font-display text-[13px] font-semibold tracking-tight text-white">Patient values</h3>
          <span className="tnum rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/70">
            {filled} set
          </span>
        </div>
        <div className="mt-3 shrink-0">
          <RiskReadout selected={selected} />
        </div>
        <div className="mt-1 min-h-0 flex-1 overflow-y-auto pb-1">

        {filled === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-white/15 p-3 text-center">
            <p className="text-xs text-white/55">No patient loaded yet.</p>
            <div className="mt-2 grid gap-1.5">
              <button
                type="button"
                onClick={() => loadSample("high")}
                disabled={!samples || samples.length === 0}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-40 hover:opacity-90"
              >
                Load high-risk example
              </button>
              <button
                type="button"
                onClick={() => loadSample("low")}
                disabled={!samples || samples.length === 0}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/85 disabled:opacity-40 hover:bg-white/10"
              >
                Load low-risk example
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wider text-white/35">
              Key levers
            </p>
            <div className="space-y-3">
              {KEY_LEVERS.map((n) => (
                <ValueRow
                  key={n}
                  name={n}
                  label={labelOf(n)}
                  unit={unitOf(n)}
                  kind={kindOf(n)}
                  value={inputs[n]}
                  onChange={(v) => set(n, v)}
                />
              ))}
            </div>
            {groupedRest.length > 0 && (
              <>
                <p className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wider text-white/35">
                  All entered values
                </p>
                {groupedRest.map((group) => (
                  <div key={group.key} className="mb-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">
                      {group.title}
                    </p>
                    <div className="space-y-3">
                      {group.names.map((n) => (
                        <ValueRow
                          key={n}
                          name={n}
                          label={labelOf(n)}
                          unit={unitOf(n)}
                          kind={kindOf(n)}
                          value={inputs[n]}
                          onChange={(v) => set(n, v)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-white/35">
              Edits re-score automatically — watch the heart recolor.
            </p>
          </>
        )}
        </div>
      </div>
    </aside>
  );
}
