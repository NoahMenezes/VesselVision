"use client";
/** First-visit guidance overlay (dismissed forever via localStorage).
 *  Verb-led items, no step numbering, plain clinical language.
 *
 *  Visibility reads through useSyncExternalStore with a server snapshot of
 *  `false`: server and first client render agree (null), so hydration never
 *  mismatches. A hydration crash here once remounted the whole tree and took
 *  the R3F canvas down with it; do not read localStorage during render.
 */
import { useState, useSyncExternalStore } from "react";
import { Button, Card } from "./ui";

const KEY = "vesselvision-onboarded-v1";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getSnapshot(): boolean {
  try {
    return localStorage.getItem(KEY) === null;
  } catch {
    return true;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

export function Onboarding() {
  const firstVisit = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || !firstVisit) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* private mode: overlay returns next visit, harmless */
    }
    setDismissed(true);
  };
  return (
    <div
      role="dialog"
      aria-label="Getting started"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
    >
      <Card className="max-w-md">
        <h2 className="font-medium">Reading a cardiovascular risk workup</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground/80">
          <li>Enter patient data manually, load an example, or drop a CSV.</li>
          <li>Explore the heart: rotate, zoom, click an artery to inspect it.</li>
          <li>Review risk: overall status, per-vessel bars, and what drove them.</li>
        </ul>
        <p className="mt-2 text-[11px] text-foreground/50">
          Decision support and education only. Not a substitute for imaging or judgment.
        </p>
        <div className="mt-3">
          <Button onClick={dismiss}>Start exploring</Button>
        </div>
      </Card>
    </div>
  );
}
