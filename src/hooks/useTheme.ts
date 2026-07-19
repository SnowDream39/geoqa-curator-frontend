import { useCallback, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// useTheme – manage dark / light mode
// ---------------------------------------------------------------------------

const THEME_KEY = "geoqa-theme";

export type ThemeMode = "system" | "light" | "dark";

function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return mode;
}

function applyThemeClass(theme: "light" | "dark") {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function useTheme(): {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
} {
  const [mode, _setMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    return stored && ["system", "light", "dark"].includes(stored)
      ? stored
      : "system";
  });

  const resolved = resolveTheme(mode);

  const setMode = useCallback((m: ThemeMode) => {
    _setMode(m);
    localStorage.setItem(THEME_KEY, m);
  }, []);

  useEffect(() => {
    applyThemeClass(resolved);
  }, [resolved]);

  // Listen for system changes when mode is "system"
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      applyThemeClass(resolveTheme("system"));
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  const toggle = useCallback(() => {
    setMode(resolved === "dark" ? "light" : "dark");
  }, [resolved, setMode]);

  return { mode, resolved, setMode, toggle };
}
