"use client";
/** Main dashboard: health check on load, 3-panel grid on desktop,
 *  tabbed panels on mobile. Placeholders until Phases 9/10/12 fill in.
 */
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { getHealth } from "@/lib/api";
import { useStore } from "@/store/VesselVisionContext";
import { Disclaimer, TopBar } from "./TopBar";
import { HeartPanel, InputPanel, ResultsPanel } from "./panels";
import { Button } from "./ui";

const TABS = [
  { id: "input", label: "Enter data" },
  { id: "heart", label: "Explore heart" },
  { id: "results", label: "Review risk" },
] as const;

export function Dashboard() {
  const { backend, setBackend } = useStore();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("input");

  useEffect(() => {
    getHealth().then((ok) => setBackend(ok ? "online" : "offline"));
  }, [setBackend]);

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <Disclaimer />
      {backend === "offline" && (
        <div role="alert" className="border-b border-risk-high/40 bg-risk-high/10 px-4 py-2 text-center text-xs">
          Backend offline. Start it with <code>make backend</code> (uvicorn :8000).
          The layout below is a preview; predictions need the API.
        </div>
      )}
      {/* Mobile tabs */}
      <nav aria-label="Dashboard sections" className="flex gap-2 p-3 lg:hidden">
        {TABS.map((t) => (
          <Button
            key={t.id}
            variant={tab === t.id ? "primary" : "ghost"}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
          >
            {t.label}
          </Button>
        ))}
      </nav>
      <main id="main" className="grid flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[320px_1fr_320px]">
        <div className={clsx(tab === "input" ? "block" : "hidden", "lg:block")}>
          <InputPanel />
        </div>
        <div className={clsx(tab === "heart" ? "block" : "hidden", "lg:block")}>
          <HeartPanel />
        </div>
        <div className={clsx(tab === "results" ? "block" : "hidden", "lg:block")}>
          <ResultsPanel />
        </div>
      </main>
    </div>
  );
}
