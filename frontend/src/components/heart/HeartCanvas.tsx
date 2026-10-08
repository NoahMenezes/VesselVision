"use client";
/** Client-only entry for the 3D heart (R3F cannot SSR). */
import dynamic from "next/dynamic";

export const HeartCanvas = dynamic(
  () => import("./HeartScene").then((m) => m.HeartScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-105 items-center justify-center rounded-xl border border-border text-xs text-foreground/60">
        Preparing 3D view…
      </div>
    ),
  },
);
