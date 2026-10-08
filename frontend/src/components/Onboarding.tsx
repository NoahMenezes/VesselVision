"use client";
/** First-visit guidance overlay (dismissed forever via localStorage).
 *  Verb-led items, no step numbering, plain clinical language.
 */
import { useState } from "react";
import { Button, Card } from "./ui";

const KEY = "vesselvision-onboarded-v1";

function firstVisit(): boolean {
  try {
    return typeof window !== "undefined" && !localStorage.getItem(KEY);
  } catch {
    return true;
  }
}

export function Onboarding() {
  const [show, setShow] = useState(firstVisit);
  if (!show) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* private mode: overlay returns next visit, harmless */
    }
    setShow(false);
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
