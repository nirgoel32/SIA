import { useCallback, useEffect, useState } from "react";

export type ThemePref = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "sia-theme";

function readStoredPref(): ThemePref {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
}

function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function resolve(pref: ThemePref): ResolvedTheme {
  return pref === "system" ? systemTheme() : pref;
}

function applyTheme(theme: ResolvedTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

/** Inline script string for _document — applied before React paints to
 *  prevent flash of incorrect theme. */
export const NO_FLASH_SCRIPT = `
(function () {
  try {
    var pref = localStorage.getItem('${STORAGE_KEY}') || 'system';
    var theme = pref === 'system'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : pref;
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>("system");
  const [resolved, setResolved] = useState<ResolvedTheme>("dark");

  // Initial hydration from localStorage.
  useEffect(() => {
    const initial = readStoredPref();
    setPref(initial);
    const r = resolve(initial);
    setResolved(r);
    applyTheme(r);
  }, []);

  // Track system changes when in 'system' mode.
  useEffect(() => {
    if (pref !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = (e: MediaQueryListEvent) => {
      const next: ResolvedTheme = e.matches ? "light" : "dark";
      setResolved(next);
      applyTheme(next);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [pref]);

  const setTheme = useCallback((next: ThemePref) => {
    setPref(next);
    const r = resolve(next);
    setResolved(r);
    applyTheme(r);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  /** Quick three-state cycle for a one-click toggle. */
  const cycleTheme = useCallback(() => {
    const order: ThemePref[] = ["light", "dark", "system"];
    const idx = order.indexOf(pref);
    setTheme(order[(idx + 1) % order.length]);
  }, [pref, setTheme]);

  return { pref, resolved, setTheme, cycleTheme };
}
