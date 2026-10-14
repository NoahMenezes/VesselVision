"use client";
/** Main dashboard: overview grid plus one focused page per tour stop.
 *  The rail (desktop) and tabs (mobile) switch pages; every page holds one
 *  part of the solution, nothing is clustered.
 */
import { useEffect, useState } from "react";
import { HeartPulse } from "lucide-react";
import { clsx } from "clsx";
import { getHealth, getSamples } from "@/lib/api";
import { useStore } from "@/store/VesselVisionContext";
import { PredictionDriver, usePrediction } from "@/hooks/usePrediction";
import { Button } from "./ui";
import { HistoryTab } from "./dashboard/HistoryTab";
import { PerformanceTab } from "./dashboard/PerformanceTab";
import { ReportTab } from "./dashboard/ReportTab";
import { Disclaimer } from "./Disclaimer";
import { GuidedRail } from "./GuidedRail";
import { ThemeToggle } from "./ThemeToggle";
import { HeartPanel, InputPanel, ResultsPanel, StepStrip } from "./panels";
import { Onboarding } from "./Onboarding";

/** Gated flow: steps 2 (heart) and 3 (results) unlock on first prediction. */
export function useUnlocked() {
  const { prediction, loading } = useStore();
  return prediction !== null || loading;
}

/** Mobile-only switcher: Patient and Heart already live in the overview
 *  scroll below, so the switcher keeps Risk, Scores, and Report as focused
 *  pages. Desktop never renders this (lg:hidden) and keeps its rail + grid. */
const MOBILE_TABS = [
  { id: "results", label: "Risk" },
  { id: "performance", label: "Scores" },
  { id: "report", label: "Report" },
  { id: "history", label: "History" },
] as const;

export function ProblemStrip() {
  return (
    <section id="problem" aria-label="The problem" className="border-b border-border-soft px-4 py-5 lg:px-6">
      <h1 className="max-w-3xl text-2xl font-bold leading-tight">
        Angiography answers CAD late and invasively. Routine workup already holds the signal.
      </h1>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        VesselVision turns 54 clinical fields into per-artery stenosis risk you can see.{" "}
        <a
          className="font-semibold text-accent underline underline-offset-2"
          href="https://github.com/NoahMenezes/VesselVision/blob/main/docs/VesselVision_Documentation.md"
          target="_blank"
          rel="noreferrer"
        >
          Full story
        </a>
      </p>
    </section>
  );
}

export function Dashboard() {
  const { backend, setBackend, tab, setTab, view, setView } = useStore();
  const unlocked = useUnlocked();

  useEffect(() => {
    getHealth().then((ok) => setBackend(ok ? "online" : "offline"));
  }, [setBackend]);

  return (
    <div className="flex min-h-dvh">
      <PredictionDriver />
      <GuidedRail />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile-only top bar: brand, status, theme. Desktop uses the rail. */}
        <div className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-border-soft bg-surface/90 px-4 py-2 backdrop-blur print:hidden lg:hidden">
          <span className="flex items-center gap-1.5">
            <HeartPulse className="h-5 w-5 text-accent" aria-hidden />
            <span className="text-sm font-bold tracking-tight">VesselVision</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] text-muted" role="status">
              <span
                aria-hidden
                className={clsx(
                  "inline-block h-2 w-2 rounded-full",
                  backend === "online" ? "bg-risk-low" : backend === "offline" ? "bg-risk-high" : "bg-border animate-pulse",
                )}
              />
              {backend === "online" ? "Ready" : backend === "offline" ? "Offline" : "Starting"}
            </span>
            <ThemeToggle />
          </span>
        </div>
        <Disclaimer />
        <Onboarding />
        <div aria-live="polite" className="sr-only">
          {backend === "offline"
            ? "Not connected."
            : backend === "online"
              ? "Ready."
              : "Starting."}
        </div>
        {backend === "offline" && (
          <div role="alert" className="border-b border-risk-high/20 bg-risk-high/[0.06] px-4 py-2 text-center text-xs">
            Not connected. The layout below is a preview — predictions need a connection.
          </div>
        )}
        {/* Mobile section switch (Risk unlocks after prediction) */}
        <nav aria-label="Dashboard sections" className="p-3 lg:hidden">
          <div role="group" className="grid grid-cols-4 rounded-lg bg-rail p-1">
            {MOBILE_TABS.map((t) => {
              const gated = !unlocked && t.id === "results";
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={gated}
                  title={gated ? "Unlocks after your first prediction" : undefined}
                  onClick={() => {
                    // Tapping the active tab returns to the overview grid.
                    // Report has no tab slot of its own; the view tracks it.
                    if ((tab === t.id || view === t.id) && view !== "overview") {
                      setView("overview");
                    } else {
                      if (t.id === "results" || t.id === "performance") setTab(t.id);
                      setView(t.id);
                    }
                  }}
                  aria-pressed={t.id === "report" ? view === "report" : tab === t.id}
                  className={clsx(
                    "rounded-md px-1 py-2 text-[13px] font-semibold transition-colors duration-200",
                    tab === t.id ? "bg-surface text-foreground shadow-sm" : "text-muted",
                    gated && "opacity-40",
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </nav>
        {view === "overview" ? (
          <>
            <ProblemStrip />
            <PageGrid />
          </>
        ) : (
          <FocusedPage />
        )}
      </div>
    </div>
  );
}

/** Start layout: step strip on top, patient data centered. The heart and
 *  results return (three-column grid) once the first prediction lands. */
/** One click for judges: loads the high-risk example, scores it, and drops
 *  you at the recolored heart. */
function DemoButton() {
  const { setInputs, setError, error } = useStore();
  const { predictNow } = usePrediction();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    const samples = await getSamples();
    const s = samples.find((x) => x.description.includes("high-risk")) ?? samples[0];
    if (!s) {
      setBusy(false);
      return;
    }
    setInputs({ ...s.inputs });
    setError(null);
    await predictNow({ ...s.inputs });
    setBusy(false);
    requestAnimationFrame(() => {
      document.getElementById("explore-heart")?.scrollIntoView({ behavior: "smooth" });
    });
  };
  return (
    <div className="text-center">
      <Button onClick={() => void run()} disabled={busy}>
        {busy ? "Running demo…" : "Run demo patient →"}
      </Button>
      <p className="mt-1.5 text-xs text-muted">
        Loads a high-risk case and scores it instantly.
      </p>
      {error ? <p className="mt-1 text-xs text-risk-moderate">{error}</p> : null}
    </div>
  );
}

/** Start layout: step strip on top, patient data centered. The heart and
 *  results return (three-column grid) once the first prediction lands. */
function StartPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-2xl flex-1 space-y-4 p-3 lg:px-6">
      <StepStrip />
      <DemoButton />
      <div id="enter-data" className="scroll-mt-4">
        <InputPanel />
      </div>
    </main>
  );
}

function PageGrid() {
  const { tab, flash } = useStore();
  const unlocked = useUnlocked();
  if (!unlocked) return <StartPage />;
  return (
    <>
      {/* Mobile: one guided scroll — patient, heart, results stacked. */}
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-5 p-3 lg:hidden">
        <InputPanel />
        <HeartPanel />
        <ResultsPanel />
      </div>
      {/* Desktop: three-column grid. Untouched by the mobile build. */}
      <main id="main" className="hidden flex-1 gap-4 p-3 lg:grid lg:grid-cols-[320px_1fr_340px] lg:px-6">
        <div id="enter-data" className={clsx("scroll-mt-4 rounded-lg transition-shadow", tab === "input" ? "block" : "hidden", "lg:block", flash === "enter-data" && "ring-2 ring-accent")}>
          <InputPanel />
        </div>
        <div id="explore-heart" className={clsx("scroll-mt-4 rounded-lg transition-shadow", tab === "heart" ? "block" : "hidden", "lg:block", flash === "explore-heart" && "ring-2 ring-accent")}>
          <HeartPanel />
        </div>
        <div id="review-risk" className={clsx("scroll-mt-4 rounded-lg transition-shadow", tab === "results" ? "block" : "hidden", "lg:block", flash === "review-risk" && "ring-2 ring-accent")}>
          <ResultsPanel />
        </div>
      </main>
    </>
  );
}

function FocusedPage() {
  const { view } = useStore();
  const unlocked = useUnlocked();
  if (view === "history") {
    return (
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 space-y-4 p-3 lg:px-6">
        <HistoryTab />
      </main>
    );
  }
  if (!unlocked) return <StartPage />;
  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 space-y-4 p-3 lg:px-6">
      {view === "input" && <InputPanel />}
      {view === "heart" && <HeartPanel />}
      {view === "results" && <ResultsPanel />}
      {view === "report" && <ReportTab />}
      {view === "performance" && (
        <div id="performance" className="scroll-mt-4">
          <PerformanceTab />
        </div>
      )}
    </main>
  );
}
