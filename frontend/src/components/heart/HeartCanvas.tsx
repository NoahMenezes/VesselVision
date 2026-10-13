"use client";
/** Client-only entry for the 3D heart (R3F cannot SSR).
 *
 *  Crash-proofing rules (learned from production errors):
 *  1. The model file is HEAD-checked HERE, outside Canvas. Canvas mounts
 *     only when the GLB exists, so no suspense-error swap ever happens
 *     inside the R3F tree (that swap caused the removeChild unmount race).
 *  2. Loading and missing-file states are plain DOM, never drei portals.
 *  3. Inside Canvas, children are static:Html labels mount once and are
 *     never added/removed, so no portal teardown race.
 */
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { HEART_MODEL_URL } from "@/lib/arteries";

const Scene = dynamic(() => import("./HeartScene").then((m) => m.HeartScene), {
  ssr: false,
});

function CanvasSkeleton() {
  return (
    <div aria-label="Loading 3D heart">
      <div className="mb-2 flex gap-2">
        <div className="h-7 w-16 animate-pulse rounded bg-black/[0.06]" />
        <div className="h-7 w-16 animate-pulse rounded bg-black/[0.06]" />
        <div className="h-7 w-16 animate-pulse rounded bg-black/[0.06]" />
      </div>
      <div className="h-105 w-full animate-pulse rounded-lg bg-black/[0.04] ring-1 ring-border" />
    </div>
  );
}

export function HeartCanvas() {
  const [ready, setReady] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    fetch(HEART_MODEL_URL, { method: "HEAD" })
      .then((res) => {
        if (live) setReady(res.ok);
      })
      .catch(() => {
        if (live) setReady(false);
      });
    return () => {
      live = false;
    };
  }, []);
  if (ready === null) return <CanvasSkeleton />;
  if (!ready) {
    return (
      <div className="rounded-lg border border-risk-moderate/30 bg-risk-moderate/[0.07] p-4 text-xs">
        The 3D heart file is missing, so only the 2D schematic below is live.
      </div>
    );
  }
  return <Scene />;
}
