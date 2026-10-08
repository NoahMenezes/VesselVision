import { clsx } from "clsx";

/** Tonal surfaces carry hierarchy (no everywhere-borders); hairlines only
 *  separate, never decorate. All interactive elements: 200ms transitions +
 *  press feedback. */
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section
      className={clsx(
        "rounded-xl bg-surface p-4 shadow-[0_1px_12px_rgba(2,8,23,0.55)] ring-1 ring-border",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function Badge({ tone, children }: { tone: "low" | "moderate" | "high" | "neutral"; children: React.ReactNode }) {
  const tones = {
    low: "bg-risk-low/15 text-risk-low ring-risk-low/30",
    moderate: "bg-risk-moderate/15 text-risk-moderate ring-risk-moderate/30",
    high: "bg-risk-high/15 text-risk-high ring-risk-high/30",
    neutral: "bg-white/5 text-muted ring-border",
  } as const;
  return (
    <span
      className={clsx(
        "tnum inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] ring-1",
        tones[tone],
      )}
    >
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
        "rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 disabled:opacity-50 active:scale-[0.98]",
        variant === "primary"
          ? "bg-accent text-[#04110f] hover:bg-accent-strong"
          : "text-foreground ring-1 ring-border hover:bg-white/5",
        className,
      )}
      {...props}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-lg bg-white/[0.07]", className)} />;
}

export function Tooltip({ tip, children }: { tip: string; children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex cursor-help">
      {children}
      <span className="pointer-events-none absolute left-1/2 top-full z-10 hidden w-48 -translate-x-1/2 rounded-lg bg-surface-raised p-2 text-xs ring-1 ring-border group-hover:block">
        {tip}
      </span>
    </span>
  );
}
