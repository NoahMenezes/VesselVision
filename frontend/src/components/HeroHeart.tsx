"use client";
/** Landing hero visual: the same GLB myocardium + coronary tubes as the
 *  console, slow auto-rotate, no interaction. Neutral colors (no patient =
 *  no predictions). Runs inside a StoreProvider for the shared components.
 */
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { HEART_MODEL_URL } from "@/lib/arteries";

const HeroScene = dynamic(() => import("./HeroSceneInner").then((m) => m.HeroSceneInner), {
  ssr: false,
  loading: () => (
    <div aria-label="Loading heart preview" className="h-105 w-full animate-pulse rounded-lg bg-black/[0.04]" />
  ),
});

export function HeroHeart() {
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
  if (ready === null) {
    return (
      <div aria-label="Loading heart preview" className="h-105 w-full animate-pulse rounded-lg bg-black/[0.04]" />
    );
  }
  if (!ready) return null;
  return <HeroScene />;
}
