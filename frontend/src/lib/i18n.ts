/** Report locales. Strings live in src/locales/*.json — never in components —
 *  so a new language is one dropped-in file plus one line in LOCALES below,
 *  with zero component changes. Templates use {placeholders}, filled by
 *  fill(). The default locale is auto-detected from the browser; the user
 *  can still override per report.
 *
 *  Deliberately no machine-translation library: clinical verdicts
 *  ("likely/unlikely", decide lines) must be human-curated. Translation
 *  APIs would also need keys, network, and per-call cost for zero extra
 *  safety on medical wording.
 */
import type { VesselKey } from "./types";
import en from "@/locales/en.json";
import hi from "@/locales/hi.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import de from "@/locales/de.json";
import pt from "@/locales/pt.json";
import it from "@/locales/it.json";
import nl from "@/locales/nl.json";
import ru from "@/locales/ru.json";
import id from "@/locales/id.json";

export type ReportLang =
  | "en" | "hi" | "es" | "fr" | "de"
  | "pt" | "it" | "nl" | "ru" | "id";

export const REPORT_LANGS: { id: ReportLang; label: string }[] = [
  { id: "en", label: "English" },
  { id: "hi", label: "हिन्दी" },
  { id: "es", label: "Español" },
  { id: "fr", label: "Français" },
  { id: "de", label: "Deutsch" },
  { id: "pt", label: "Português" },
  { id: "it", label: "Italiano" },
  { id: "nl", label: "Nederlands" },
  { id: "ru", label: "Русский" },
  { id: "id", label: "Bahasa Indonesia" },
];

export const REPORT_LOCALES: Record<ReportLang, string> = {
  en: "en-US",
  hi: "hi-IN",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  pt: "pt-PT",
  it: "it-IT",
  nl: "nl-NL",
  ru: "ru-RU",
  id: "id-ID",
};

export interface ReportStrings {
  language: string;
  title: string;
  empty: string;
  valuesEntered: string;
  overall: string;
  cadLikely: string;
  cadUnlikely: string;
  decideLine: string;
  arteries: string;
  artery: string;
  territory: string;
  risk: string;
  result: string;
  decide: string;
  likely: string;
  unlikely: string;
  reasonsTitle: string;
  reasonsSub: string;
  measure: string;
  value: string;
  effect: string;
  raised: string;
  lowered: string;
  measurementsTitle: string;
  measurementsSub: string;
  normal: string;
  signal: string;
  outOfRange: string;
  rangeNote: string;
  safety: string;
  print: string;
  anatomy: Record<VesselKey, string>;
}

const LOCALES: Record<ReportLang, ReportStrings> = {
  en, hi, es, fr, de, pt, it, nl, ru, id,
};

export const REPORT_STRINGS: Record<ReportLang, ReportStrings> = LOCALES;

/** Fill {placeholders} in a locale template. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
}

/** Guess the report locale from the browser (navigator.language). Any tag
 *  whose primary subtag has a curated file wins (pt-BR → pt); everything
 *  else falls back to English strings with the browser's own date format.
 *  SSR-safe: no navigator → "en". */
export function detectLocale(): ReportLang {
  if (typeof navigator === "undefined" || typeof navigator.language !== "string") {
    return "en";
  }
  const primary = navigator.language.toLowerCase().split("-")[0];
  const curated: ReportLang[] = [
    "en", "hi", "es", "fr", "de", "pt", "it", "nl", "ru", "id",
  ];
  return curated.includes(primary as ReportLang) ? (primary as ReportLang) : "en";
}
