import { clsx } from "clsx";

/** Editorial surfaces: white cards, single hairline, one soft layered
 *  shadow. Shine comes only from top-inner highlights on pills/chips. */
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section
      className={clsx(
        "rounded-lg border border-border-soft bg-surface p-5",
        "shadow-[0_1px_2px_rgba(18,18,18,0.04),0_8px_24px_-12px_rgba(18,18,18,0.12)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function Badge({ tone, children }: { tone: "low" | "moderate" | "high" | "neutral"; children: React.ReactNode }) {
  const tones = {
    low: "bg-pill-green-bg text-risk-low",
    moderate: "bg-risk-moderate/10 text-risk-moderate",
    high: "bg-risk-high/10 text-risk-high",
    neutral: "bg-surface-soft text-muted",
  } as const;
  return (
    <span
      className={clsx(
        "tnum shine inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em]",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  variant = "primary", size = "md", className, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost"; size?: "md" | "sm" }) {
  return (
    <button
      className={clsx(
        "font-semibold transition-all duration-200 disabled:opacity-50 active:scale-[0.98]",
        size === "md" ? "rounded px-4 py-2 text-sm" : "rounded px-2.5 py-1 text-xs",
        variant === "primary"
          ? "bg-foreground text-background hover:opacity-90"
          : "border border-border bg-surface text-foreground hover:bg-surface-soft",
        className,
      )}
      {...props}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-lg bg-rail", className)} />;
}

export function Tooltip({ tip, children }: { tip: string; children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex cursor-help">
      {children}
      <span className="pointer-events-none absolute left-1/2 top-full z-10 hidden w-48 -translate-x-1/2 rounded-lg border border-border-soft bg-surface p-2 text-xs text-foreground shadow-lg group-hover:block">
        {tip}
      </span>
    </span>
  );
}
