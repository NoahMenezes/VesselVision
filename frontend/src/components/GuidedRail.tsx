"use client";
/** Guided rail: the checkup path down the left edge. Patient and Heart live
 *  in the overview itself, so the rail keeps Overview, Results, Accuracy
 *  plus a printable Report and a Docs link. One status line tells you
 *  whether predictions are ready. No tech talk anywhere.
 *  240px expanded by default with a labeled, persisted collapse toggle;
 *  icon + tiny label at 64px; hidden on mobile where tabs take over.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  ChevronLeft,
  FileText,
  FlaskConical,
  HeartPulse,
  Info,
} from "lucide-react";
import { clsx } from "clsx";
import { useStore } from "@/store/VesselVisionContext";

const STEPS = [
  { id: "problem", label: "Overview", desc: "What this checks", icon: Info },
  { id: "review-risk", label: "Results", desc: "Understand the reasons", icon: Activity },
  { id: "performance", label: "Accuracy", desc: "How right is it", icon: BarChart3 },
  { id: "report", label: "Report", desc: "Print or save", icon: FileText },
] as const;

const DOCS_URL =
  "https://github.com/NoahMenezes/VesselVision/blob/main/docs/VesselVision_Documentation.md";

const PREF_KEY = "vesselvision-rail-v1";

function subscribeRail(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getRailSnapshot(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) !== "closed";
  } catch {
    return true;
  }
}

function getRailServerSnapshot(): boolean {
  return true;
}

const STATUS = {
  online: { dot: "bg-risk-low", text: "Ready" },
  offline: { dot: "bg-risk-high", text: "Not connected" },
  checking: { dot: "bg-border animate-pulse", text: "Starting…" },
} as const;

export function GuidedRail() {
  const { backend, tab, setTab, setView, setFlash, prediction, loading } = useStore();
  const storedOpen = useSyncExternalStore(subscribeRail, getRailSnapshot, getRailServerSnapshot);
  const [override, setOverride] = useState<boolean | null>(null);
  const open = override ?? storedOpen;
  const [active, setActive] = useState<string>("problem");
  const unlocked = prediction !== null || loading;

  useEffect(() => {
    const ids = STEPS.map((t) => t.id);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const toggle = () => {
    const next = !open;
    try {
      localStorage.setItem(PREF_KEY, next ? "open" : "closed");
    } catch {
      /* ignore */
    }
    setOverride(next);
  };

  const go = (id: string) => {
    // Each stop opens its own page: the section fills the screen, so
    // the navigation visibly acts even when nothing needs scrolling.
    const viewFor: Record<string, "overview" | "input" | "heart" | "results" | "performance" | "report"> = {
      problem: "overview",
      "enter-data": "input",
      "explore-heart": "heart",
      "review-risk": "results",
      performance: "performance",
      report: "report",
    };
    const tabFor: Record<string, "input" | "heart" | "results" | "performance"> = {
      problem: tab,
      "enter-data": "input",
      "explore-heart": "heart",
      "review-risk": "results",
      performance: "performance",
      report: tab,
    };
    setView(viewFor[id]);
    setTab(tabFor[id]);
    setFlash(null);
    requestAnimationFrame(() => {
      if (id === "problem") {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

  const status = STATUS[backend];

  return (
    <aside
      aria-label="Checkup steps"
      className={clsx(
        "sticky top-0 hidden h-dvh shrink-0 flex-col bg-rail lg:flex",
        open ? "w-60" : "w-16",
      )}
    >
      <div className="flex items-center gap-2 px-4 pt-4">
        <HeartPulse className="h-6 w-6 shrink-0 text-accent" aria-hidden />
        {open && (
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight">VesselVision</p>
            <p className="text-[11px] text-muted">Heart risk checker</p>
          </div>
        )}
      </div>

      <div className={clsx("flex items-center gap-2 px-4 pt-3", !open && "justify-center px-0")}>
        <span aria-hidden className={clsx("inline-block h-2 w-2 shrink-0 rounded-full", status.dot)} />
        {open && (
          <span className="text-xs text-muted" role="status">
            {status.text}
          </span>
        )}
      </div>

      {open && (
        <p className="px-4 pt-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
          Checkup steps
        </p>
      )}
      <nav aria-label="Sections" className="mt-2 flex flex-col gap-1 px-2">
        {STEPS.map((t, i) => {
          const isActive = active === t.id;
          const gated = !unlocked && (t.id === "review-risk" || t.id === "report");
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => go(t.id)}
              aria-current={isActive ? "true" : undefined}
              title={gated ? `${t.label}: unlocks after your first prediction` : `${t.label}: ${t.desc}`}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors duration-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.07]",
                !open && "flex-col justify-center gap-1",
                gated && "opacity-40",
              )}
            >
              {open ? (
                <>
                  <span
                    aria-hidden
                    className={clsx(
                      "tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                      isActive ? "bg-foreground text-background" : "border border-border text-muted",
                    )}
                  >
                    {i === 0 ? "•" : i}
                  </span>
                  <span className="leading-tight">
                    <span className={clsx("block text-sm", isActive ? "font-semibold text-foreground" : "font-normal text-muted")}>
                      {t.label}
                    </span>
                    <span className="block text-[11px] text-muted">{t.desc}</span>
                  </span>
                </>
              ) : (
                <>
                  <t.icon
                    aria-hidden
                    className={clsx("h-[18px] w-[18px] shrink-0", isActive ? "text-foreground" : "text-muted")}
                  />
                  <span className={clsx("text-[9px] font-semibold leading-none", isActive ? "text-foreground" : "text-muted")}>
                    {t.label}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto px-2 pb-3">
        {open && (
          <div className="mb-2 px-2 text-xs">
            <a
              className="flex items-center gap-2 py-1 text-muted hover:text-foreground"
              href={DOCS_URL}
              target="_blank"
              rel="noreferrer"
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden /> Docs
            </a>
            <a
              className="flex items-center gap-2 py-1 text-muted hover:text-foreground"
              href="https://github.com/NoahMenezes/VesselVision"
              target="_blank"
              rel="noreferrer"
            >
              <FlaskConical className="h-3.5 w-3.5" aria-hidden /> GitHub
            </a>
            <p className="py-1 text-muted">For decision support only.</p>
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          title={open ? "Collapse sidebar" : "Expand sidebar"}
          className={clsx(
            "mt-2 flex w-full items-center rounded-md border border-border bg-surface py-1.5 hover:bg-surface-soft",
            open ? "justify-between px-3" : "justify-center",
          )}
        >
          {open && <span className="text-xs font-medium text-muted">Collapse</span>}
          <ChevronLeft className={clsx("h-4 w-4 text-muted transition-transform", !open && "rotate-180")} aria-hidden />
        </button>
      </div>
    </aside>
  );
}
