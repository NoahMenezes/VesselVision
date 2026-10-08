"use client";
/** Client-only entry for the 3D heart (R3F cannot SSR). */
import dynamic from "next/dynamic";

export const HeartCanvas = dynamic(
  () => import("./HeartScene").then((m) => m.HeartScene),
  {
    ssr: false,
    loading: () => (
      <div aria-label="Loading 3D heart">
        <div className="mb-2 flex gap-2">
          <div className="h-7 w-16 animate-pulse rounded bg-black/[0.06]" />
          <div className="h-7 w-16 animate-pulse rounded bg-black/[0.06]" />
          <div className="h-7 w-16 animate-pulse rounded bg-black/[0.06]" />
        </div>
        <div className="h-105 w-full animate-pulse rounded-lg bg-black/[0.04] ring-1 ring-border" />
      </div>
    ),
  },
);
