"use client";
/** Dark/light switch. Writes an explicit data-theme on <html> (whole app
 *  follows, both landing and console) and persists the choice. With no
 *  stored choice the OS preference applies via pure CSS, so the toggle
 *  reflects OS state until the user picks. Sun/moon lucide pair.
 *  Reads through useSyncExternalStore (same pattern as the rail): no
 *  effect-driven setState, no hydration mismatch.
 */
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "vesselvision-theme";

type Theme = "light" | "dark";

function systemTheme(): Theme {
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.dataset.theme;
  if (attr === "dark" || attr === "light") return attr;
  return systemTheme();
}

function subscribeTheme(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }
  const cleanups: (() => void)[] = [];
  if (typeof MutationObserver !== "undefined") {
    const obs = new MutationObserver(onChange);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    cleanups.push(() => obs.disconnect());
  }
  if (typeof window.matchMedia === "function") {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const run = () => onChange();
    mq.addEventListener("change", run);
    cleanups.push(() => mq.removeEventListener("change", run));
  }
  return () => {
    for (const fn of cleanups) fn();
  };
}

function getThemeSnapshot(): Theme {
  return currentTheme();
}

function getServerSnapshot(): Theme {
  return "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerSnapshot);

  const flip = () => {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* private mode: preference lasts the session */
    }
  };

  return (
    <button
      type="button"
      suppressHydrationWarning
      onClick={flip}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-foreground"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Moon className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
