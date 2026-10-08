"use client";
/** Guided rail: Boardafolio-pattern sidebar (identity, tour, problem, live
 *  pipeline status, per-target dots, outbound links, credit footer).
 *  240px expanded by default with a persisted collapse toggle; icon-only at
 *  64px; hidden on mobile where segmented tabs take over. Absorbs TopBar.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Activity,
  BarChart3,
  ChevronLeft,
  ClipboardList,
  FlaskConical,
  Heart,
  HeartPulse,
  Info,
  Link2,
} from "lucide-react";
import { clsx } from "clsx";
import { usePipelineStatus } from "@/hooks/usePipelineStatus";
import { useStore } from "@/store/VesselVisionContext";
import { Badge } from "./ui";

const TOUR = [
  { id: "problem", label: "The problem", icon: Info },
  { id: "enter-data", label: "Enter data", icon: ClipboardList },
  { id: "explore-heart", label: "Explore heart", icon: Heart },
  { id: "review-risk", label: "Review risk", icon: Activity },
  { id: "performance", label: "Performance", icon: BarChart3 },
] as const;

const VESSELS = ["CAD", "LAD", "LCX", "RCA"] as const;
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

function Dot({ on, label }: { on: boolean | null; label: string }) {
  return (
    <span className="flex items-center gap-2 text-xs" title={label}>
      <span
        aria-hidden
        className={clsx(
          "inline-block h-2 w-2 rounded-full",
          on === null ? "bg-border" : on ? "bg-risk-low" : "bg-border",
        )}
      />
      <span className="text-muted">{label}</span>
    </span>
  );
}

export function GuidedRail() {
  const { backend, tab, setTab, setFlash } = useStore();
  const status = usePipelineStatus();
  const storedOpen = useSyncExternalStore(subscribeRail, getRailSnapshot, getRailServerSnapshot);
  const [override, setOverride] = useState<boolean | null>(null);
  const open = override ?? storedOpen;
  const [active, setActive] = useState<string>("problem");

  useEffect(() => {
    const ids = TOUR.map((t) => t.id);
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
    // Each tour stop visibly acts: mobile tab switches, the page scrolls,
    // and the target section pulses so the navigation is unmistakable.
    const tabFor: Record<string, "input" | "heart" | "results" | null> = {
      problem: null,
      "enter-data": "input",
      "explore-heart": "heart",
      "review-risk": "results",
      performance: "results",
    };
    const flashFor: Record<string, string | null> = {
      problem: null,
      "enter-data": "enter-data",
      "explore-heart": "explore-heart",
      "review-risk": "review-risk",
      performance: "review-risk",
    };
    const t = tabFor[id];
    if (t && t !== tab) setTab(t);
    setFlash(flashFor[id]);
    window.setTimeout(() => setFlash(null), 1600);
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <aside
      aria-label="Guided tour"
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
            <p className="text-[11px] text-muted">Track A · CAD risk</p>
          </div>
        )}
      </div>

      {open && (
        <div className="px-4 pt-3">
          <Badge tone={backend === "online" ? "low" : backend === "offline" ? "high" : "neutral"}>
            {backend === "online" ? "Backend online" : backend === "offline" ? "Backend offline" : "Checking backend"}
          </Badge>
        </div>
      )}

      <nav aria-label="Judges tour" className="mt-4 flex flex-col gap-0.5 px-2">
        {TOUR.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => go(t.id)}
            aria-current={active === t.id ? "true" : undefined}
            title={t.label}
            className={clsx(
              "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors duration-200 hover:bg-black/[0.04]",
              active === t.id ? "font-semibold text-foreground" : "font-normal text-muted",
            )}
          >
            <t.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
            {open && <span>{t.label}</span>}
          </button>
        ))}
      </nav>

      {open && (
        <div className="mt-4 border-t border-border-soft px-4 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">Pipeline</p>
          <div className="mt-2 space-y-1.5">
            <Dot on={status.api} label="API online" />
            <Dot on={status.schema} label="Dataset schema" />
            <Dot on={status.models} label="Models trained" />
            <Dot on={status.explain} label="Explainability" />
          </div>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">Targets</p>
          {status.models ? (
            <div className="mt-2 space-y-1.5">
              {VESSELS.map((v) => (
                <Dot key={v} on={true} label={`${v} live`} />
              ))}
            </div>
          ) : (
            <p className="mt-1 text-[11px] text-muted">Models appear here after training finishes.</p>
          )}
        </div>
      )}

      <div className="mt-auto px-2 pb-3">
        {open && (
          <div className="mb-2 space-y-0.5 px-2 text-xs">
            <a
              className="flex items-center gap-2 py-1 text-muted hover:text-foreground"
              href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/docs`}
              target="_blank"
              rel="noreferrer"
            >
              <Link2 className="h-3.5 w-3.5" aria-hidden /> API docs
            </a>
            <a
              className="flex items-center gap-2 py-1 text-muted hover:text-foreground"
              href="https://github.com/NoahMenezes/VesselVision"
              target="_blank"
              rel="noreferrer"
            >
              <FlaskConical className="h-3.5 w-3.5" aria-hidden /> GitHub
            </a>
            <p className="py-1 text-muted">Demo video records pre-submission.</p>
          </div>
        )}
        {open && (
          <p className="border-t border-border-soft px-2 pt-2 text-[10px] leading-snug text-muted">
            Decision support only. Data: UCI-411 CC-BY. Heart: Sketchfab, license TBD.
          </p>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          className="mt-2 flex w-full items-center justify-center rounded-md border border-border bg-surface py-1.5 hover:bg-surface-soft"
        >
          <ChevronLeft className={clsx("h-4 w-4 text-muted transition-transform", !open && "rotate-180")} aria-hidden />
        </button>
      </div>
    </aside>
  );
}
