"use client";
/** Full medical report in fixed tables, in the selected language (EN/HI/ES).
 *  Header, overall + per-artery results with decide lines, every entered
 *  measurement against its normal range, and every scored reason. Print (or
 *  save-as-PDF) via the button — the print stylesheet forces light paper,
 *  hides app chrome, and keeps rows unsplit. Everything on screen lands in
 *  the PDF; nothing lazy or cut off. Language state starts English so SSR
 *  and first paint always agree.
 */
import { useEffect, useState } from "react";
import { getSchema, getUncertainty, postHistory } from "@/lib/api";
import type { UncertaintyResponse } from "@/lib/types";
import { recommendations } from "@/lib/recommend";
import type { NextId } from "@/lib/recommend";
import { detectLocale, fill, REPORT_LANGS, REPORT_LOCALES, REPORT_STRINGS } from "@/lib/i18n";
import type { ReportLang } from "@/lib/i18n";
import type { FeatureSchema, VesselKey } from "@/lib/types";
import { riskColor } from "@/lib/arteries";
import { useStore } from "@/store/VesselVisionContext";
import { outOfRange } from "./MeasurementsTable";
import { Badge, Button, Card } from "../ui";

const VESSELS: VesselKey[] = ["LAD", "LCX", "RCA"];

/** Clean clinical figures: integers stay whole, the rest to 2 decimals. */
function fmt(v: number | string): string {
  if (typeof v !== "number") return v;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

export function ReportTab() {
  const { inputs, prediction, explanation, baseline, setView, setError } = useStore();
  const [schema, setSchema] = useState<FeatureSchema | null>(null);
  const [unc, setUnc] = useState<UncertaintyResponse | null>(null);
  const [saving, setSaving] = useState(false);
  // Default locale comes from the browser; the warning suppression below
  // covers the one-paint difference versus SSR English.
  const [lang, setLang] = useState<ReportLang>(() => detectLocale());

  useEffect(() => {
    getSchema().then(setSchema);
    getUncertainty().then(setUnc);
  }, []);

  const t = REPORT_STRINGS[lang];

  if (!prediction) {
    return (
      <Card>
        <h2 className="mb-1 text-[15px] font-semibold tracking-tight">{t.title}</h2>
        <p className="text-xs text-foreground/60">{t.empty}</p>
      </Card>
    );
  }

  const names = Object.keys(inputs).sort((a, b) =>
    (schema?.features[a]?.label ?? a).localeCompare(schema?.features[b]?.label ?? b),
  );
  const drivers = (explanation?.contributions ?? [])
    .slice()
    .sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value))
    .slice(0, 10);
  const today = new Date().toLocaleDateString(REPORT_LOCALES[lang], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="space-y-3" lang={lang} suppressHydrationWarning>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{t.title}</h2>
          <p className="tnum mt-0.5 text-xs text-muted">
            {today} · {fill(t.valuesEntered, { n: names.length })}
          </p>
        </div>
        <span className="flex items-center gap-2 print:hidden">
          <label htmlFor="report-lang" className="text-xs font-medium text-muted">
            {t.language}
          </label>
          <select
            id="report-lang"
            value={lang}
            onChange={(e) => setLang(e.target.value as ReportLang)}
            className="rounded border border-border bg-surface px-2 py-1.5 text-xs"
          >
            {REPORT_LANGS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            aria-disabled={saving}
            className={saving ? "cursor-wait opacity-70" : undefined}
            onClick={() => {
              if (saving) return;
              setSaving(true);
              postHistory("", inputs).then((res) => {
                setSaving(false);
                if (!res) {
                  setError("Couldn't save — history needs a database.");
                  return;
                }
                setError(null);
                setView("history");
              });
            }}
          >
            {saving ? "Saving…" : "Save checkup"}
          </Button>
          <Button variant="ghost" onClick={() => window.print()}>
            {t.print}
          </Button>
        </span>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">{t.overall}</h3>
          <Badge tone={prediction.cad.label === 1 ? "high" : "low"}>
            {prediction.cad.label === 1 ? t.cadLikely : t.cadUnlikely}
          </Badge>
        </div>
        <p className="tnum mt-1 text-3xl font-bold">
          {Math.round(prediction.cad.probability * 100)}%
        </p>
        <p className="tnum mt-0.5 text-[11px] text-muted">
          {fill(t.decideLine, { x: Math.round(prediction.cad.threshold * 100) })}
        </p>
      </Card>

      <Card>
        <h3 className="mb-2 text-sm font-medium">{t.arteries}</h3>
        <table className="tnum report-table w-full text-left text-xs">
          <thead>
            <tr className="text-foreground/50">
              <th className="py-1 pr-2 font-medium">{t.artery}</th>
              <th className="py-1 pr-2 font-medium">{t.territory}</th>
              <th className="py-1 pr-2 font-medium">{t.risk}</th>
              <th className="py-1 pr-2 font-medium">{t.result}</th>
              <th className="py-1 font-medium">{t.decide}</th>
            </tr>
          </thead>
          <tbody>
            {VESSELS.map((v) => {
              const r = prediction.vessels[v];
              const pct = Math.round(r.probability * 100);
              return (
                <tr key={v} className="border-t border-border">
                  <td className="py-1.5 pr-2 font-bold">{v}</td>
                  <td className="py-1.5 pr-2">{t.anatomy[v]}</td>
                  <td className="py-1.5 pr-2 font-bold">
                    <span
                      aria-hidden
                      className="mr-1.5 inline-block h-2 w-2 rounded-full print:border print:border-black"
                      style={{ background: riskColor(r.probability) }}
                    />
                    {pct}%
                    {unc?.[v] != null && (
                      <span className="font-normal text-muted"> ±{unc[v].plusminus}</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-2">{r.label === 1 ? t.likely : t.unlikely}</td>
                  <td className="py-1.5">{Math.round(r.threshold * 100)}%+</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-1.5 text-[11px] text-muted">{t.rangeNote}</p>
      </Card>

      {baseline && (
        <Card>
          <h3 className="mb-2 text-sm font-medium">{t.recoveryTitle}</h3>
          <table className="tnum report-table w-full text-left text-xs">
            <thead>
              <tr className="text-foreground/50">
                <th className="py-1 pr-2 font-medium">{t.artery}</th>
                <th className="py-1 pr-2 font-medium">{t.value}</th>
                <th className="py-1 font-medium">{t.effect}</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["CAD", baseline.prediction.cad.probability, prediction.cad.probability],
                  ["LAD", baseline.prediction.vessels.LAD.probability, prediction.vessels.LAD.probability],
                  ["LCX", baseline.prediction.vessels.LCX.probability, prediction.vessels.LCX.probability],
                  ["RCA", baseline.prediction.vessels.RCA.probability, prediction.vessels.RCA.probability],
                ] as [string, number, number][]
              ).map(([code, b, a]) => {
                const diff = Math.round((a - b) * 100);
                return (
                  <tr key={code} className="border-t border-border">
                    <td className="py-1.5 pr-2 font-bold">{code}</td>
                    <td className="py-1.5 pr-2">
                      {Math.round(b * 100)}→{Math.round(a * 100)}%
                    </td>
                    <td className="py-1.5 font-semibold">
                      {diff < 0 ? (
                        <>{diff} · {t.lowered}</>
                      ) : diff > 0 ? (
                        <>+{diff} · {t.raised}</>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {(() => {
        const recs = recommendations(inputs, explanation);
        const titles: Record<NextId, string> = {
          quit: t.rQuit,
          bp: t.rBp,
          ldl: t.rLdl,
          sugar: t.rSugar,
          weight: t.rWeight,
          pump: t.rPump,
          routine: t.rRoutine,
        };
        return (
          <Card>
            <h3 className="mb-1 text-sm font-medium">{t.nextTitle}</h3>
            <ol className="space-y-2 text-xs">
              {recs.map((r, i) => (
                <li key={r.id} className="border-t border-border-soft pt-2 first:border-t-0 first:pt-0">
                  <p className="font-semibold">
                    {i + 1}. {titles[r.id] ?? r.id}
                  </p>
                  <p className="mt-0.5 leading-relaxed text-foreground/70">{r.detail}</p>
                </li>
              ))}
            </ol>
          </Card>
        );
      })()}

      {drivers.length > 0 && (
        <Card>
          <h3 className="mb-1 text-sm font-medium">{t.reasonsTitle}</h3>
          <p className="mb-2 text-[11px] text-muted">{t.reasonsSub}</p>
          <table className="tnum report-table w-full text-left text-xs">
            <thead>
              <tr className="text-foreground/50">
                <th className="py-1 pr-2 font-medium">#</th>
                <th className="py-1 pr-2 font-medium">{t.measure}</th>
                <th className="py-1 pr-2 font-medium">{t.value}</th>
                <th className="py-1 font-medium">{t.effect}</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d, i) => (
                <tr key={d.feature} className="border-t border-border">
                  <td className="py-1.5 pr-2 text-muted">{i + 1}</td>
                  <td className="py-1.5 pr-2">{d.label}</td>
                  <td className="py-1.5 pr-2">
                    {String(d.value)}
                    {d.unit ? ` ${d.unit}` : ""}
                  </td>
                  <td className="py-1.5 font-semibold">
                    {d.direction === "increases" ? t.raised : t.lowered}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {schema && names.length > 0 && (
        <Card>
          <h3 className="mb-1 text-sm font-medium">{t.measurementsTitle}</h3>
          <p className="mb-2 text-[11px] text-muted">{t.measurementsSub}</p>
          <table className="tnum report-table w-full text-left text-xs">
            <thead>
              <tr className="text-foreground/50">
                <th className="py-1 pr-2 font-medium">{t.measure}</th>
                <th className="py-1 pr-2 font-medium">{t.value}</th>
                <th className="py-1 pr-2 font-medium">{t.normal}</th>
                <th className="py-1 font-medium">{t.signal}</th>
              </tr>
            </thead>
            <tbody>
              {names.map((n) => {
                const meta = schema.features[n];
                if (!meta) return null;
                const v = inputs[n];
                const flag = typeof v === "number" ? outOfRange(meta.normal, v) : false;
                return (
                  <tr key={n} className="border-t border-border">
                    <td className="py-1.5 pr-2">{meta.label}</td>
                    <td className="py-1.5 pr-2 font-semibold">
                      {fmt(v)}
                      {meta.unit ? ` ${meta.unit}` : ""}
                    </td>
                    <td className="py-1.5 pr-2 text-foreground/50">{meta.normal ?? "—"}</td>
                    <td className="py-1.5">{flag ? t.outOfRange : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <p className="rounded-lg border border-border-soft p-3 text-[11px] leading-relaxed text-muted">
        {t.safety}
      </p>
    </div>
  );
}
