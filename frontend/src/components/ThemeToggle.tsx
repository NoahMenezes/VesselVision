"use client";
/** Dark/light switch. Writes data-theme on <html> (whole app follows, both
 *  landing and console) and persists the choice; first visit follows the OS
 *  preference via the pre-paint script in layout.tsx. Sun/moon lucide pair.
 *  Reads through useSyncExternalStore (same pattern as the rail), so no
 *  effect-driven setState and no hydration mismatch.
 */
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "vesselvision-theme";

type Theme = "light" | "dark";

function subscribeTheme(onChange: () => void): () => void {
  if (typeof MutationObserver === "undefined") return () => {};
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}

function getThemeSnapshot(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerSnapshot);

  const flip = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
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
