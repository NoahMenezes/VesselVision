"use client";
/** DOM error boundary around the 3D canvas. If R3F/drei ever throws (GLB
 *  parse failure, portal race, GPU loss), the dashboard survives: guidance
 *  shows and the 2D schematic below stays fully live.
 */
import { Component } from "react";
import type { ReactNode } from "react";

export class CanvasErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    // Visible in devtools, never in the UI copy.
    console.error("[HeartCanvas]", error);
  }
  render() {
    if (this.state.failed) {
      return (
        <div
          role="alert"
          className="rounded-lg border border-risk-moderate/30 bg-risk-moderate/[0.07] p-4 text-xs"
        >
          <p className="font-semibold">3D view unavailable.</p>
          <p className="mt-1 text-muted">
            The interactive heart failed to start. The 2D schematic and vessel
            buttons below use the same colors and selection.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
