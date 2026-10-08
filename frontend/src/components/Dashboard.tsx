"use client";
/** Main dashboard: guided rail + content. Health check on load, segmented
 *  section switch on mobile, anchor ids feed the rail scroll-spy.
 */
import { useEffect } from "react";
import { clsx } from "clsx";
import { getHealth } from "@/lib/api";
import { useStore } from "@/store/VesselVisionContext";
import { Disclaimer } from "./Disclaimer";
import { GuidedRail } from "./GuidedRail";
import { HeartPanel, InputPanel, ResultsPanel } from "./panels";
import { Onboarding } from "./Onboarding";

const TABS = [
  { id: "input", label: "Enter data" },
  { id: "heart", label: "Explore heart" },
  { id: "results", label: "Review risk" },
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
  const { backend, setBackend, tab, setTab, flash } = useStore();

  useEffect(() => {
    getHealth().then((ok) => setBackend(ok ? "online" : "offline"));
  }, [setBackend]);

  return (
    <div className="flex min-h-dvh">
      <GuidedRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <Disclaimer />
        <Onboarding />
        <div aria-live="polite" className="sr-only">
          {backend === "offline"
            ? "Predictions offline."
            : backend === "online"
              ? "Predictions live."
              : "Connecting to the prediction service."}
        </div>
        {backend === "offline" && (
          <div role="alert" className="border-b border-risk-high/20 bg-risk-high/[0.06] px-4 py-2 text-center text-xs">
            The prediction service is offline.
            The layout below is a preview; predictions need it running.
          </div>
        )}
        <ProblemStrip />
        {/* Mobile segmented section switch */}
        <nav aria-label="Dashboard sections" className="p-3 lg:hidden">
          <div role="group" className="grid grid-cols-3 rounded-lg bg-rail p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-pressed={tab === t.id}
                className={clsx(
                  "rounded-md px-2 py-2 text-[13px] font-semibold transition-colors duration-200",
                  tab === t.id ? "bg-surface text-foreground shadow-sm" : "text-muted",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </nav>
        <main id="main" className="grid flex-1 grid-cols-1 gap-4 p-3 lg:grid-cols-[320px_1fr_340px] lg:px-6">
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
      </div>
    </div>
  );
}
