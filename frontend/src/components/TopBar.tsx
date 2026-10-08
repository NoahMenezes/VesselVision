import { HeartPulse } from "lucide-react";
import { useStore } from "@/store/VesselVisionContext";
import { Badge } from "./ui";

export function TopBar() {
  const { backend } = useStore();
  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4">
      <div className="flex items-center gap-2">
        <HeartPulse className="h-5 w-5 text-accent" aria-hidden />
        <span className="font-semibold">VesselVision</span>
        <span className="text-xs text-foreground/60">CAD risk visualization</span>
      </div>
      {backend === "online" ? (
        <Badge tone="low">Backend online</Badge>
      ) : backend === "offline" ? (
        <Badge tone="high">Backend offline</Badge>
      ) : (
        <Badge tone="neutral">Checking backend…</Badge>
      )}
    </header>
  );
}

export function Disclaimer() {
  return (
    <div role="note" aria-label="Clinical disclaimer" className="border-b border-risk-moderate/40 bg-risk-moderate/10 px-4 py-2 text-center text-xs">
      For decision support and educational purposes only. Not a substitute for
      formal diagnostic imaging or clinical judgment.
    </div>
  );
}
