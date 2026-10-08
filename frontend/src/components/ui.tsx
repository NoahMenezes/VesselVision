import { clsx } from "clsx";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={clsx("rounded-xl border border-border bg-surface p-4", className)}>
      {children}
    </div>
  );
}

export function Badge({ tone, children }: { tone: "low" | "moderate" | "high" | "neutral"; children: React.ReactNode }) {
  const tones = {
    low: "bg-risk-low/15 text-risk-low border-risk-low/40",
    moderate: "bg-risk-moderate/15 text-risk-moderate border-risk-moderate/40",
    high: "bg-risk-high/15 text-risk-high border-risk-high/40",
    neutral: "bg-white/5 text-foreground border-border",
  } as const;
  return (
    <span className={clsx("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

export function Button({
  variant = "primary", className, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  return (
    <button
      className={clsx(
        "rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
        variant === "primary"
          ? "bg-accent text-black hover:brightness-110"
          : "border border-border bg-transparent hover:bg-white/5",
        className,
      )}
      {...props}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-lg bg-white/10", className)} />;
}

export function Tooltip({ tip, children }: { tip: string; children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex cursor-help">
      {children}
      <span className="pointer-events-none absolute left-1/2 top-full z-10 hidden w-48 -translate-x-1/2 rounded-lg border border-border bg-surface p-2 text-xs group-hover:block">
        {tip}
      </span>
    </span>
  );
}
