import { HeartPulse } from "lucide-react";
import { useStore } from "@/store/VesselVisionContext";
import { Badge } from "./ui";

export function TopBar() {
  const { backend } = useStore();
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background-soft px-4">
      <div className="flex items-baseline gap-2">
        <HeartPulse className="h-5 w-5 translate-y-[3px] text-accent-strong" aria-hidden />
        <span className="text-[15px] font-semibold tracking-tight">VesselVision</span>
        <span className="hidden text-xs text-muted sm:inline">Coronary risk console</span>
      </div>
      {backend === "online" ? (
        <Badge tone="low">Backend online</Badge>
      ) : backend === "offline" ? (
        <Badge tone="high">Backend offline</Badge>
      ) : (
        <Badge tone="neutral">Checking backend</Badge>
      )}
    </header>
  );
}

export function Disclaimer() {
  return (
    <div role="note" aria-label="Clinical disclaimer" className="border-b border-risk-moderate/30 bg-risk-moderate/[0.07] px-4 py-2 text-center text-xs text-foreground/80">
      For decision support and educational purposes only. Not a substitute for
      formal diagnostic imaging or clinical judgment.
    </div>
  );
}
