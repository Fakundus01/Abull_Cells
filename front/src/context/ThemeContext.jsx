// src/context/ThemeContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_THEME, THEMES, getThemeMeta, isValidTheme } from "./themes";

const ThemeContext = createContext();

const STORAGE_KEY = "theme";

function getInitialTheme() {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (isValidTheme(saved)) return saved;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.dataset.theme = theme;
    // Le avisa al navegador si pintar los controles nativos (scrollbars, inputs
    // de fecha, autofill) en variante clara u oscura.
    document.documentElement.style.colorScheme = getThemeMeta(theme)?.dark
      ? "dark"
      : "light";
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      themes: THEMES,
      isDark: getThemeMeta(theme)?.dark ?? true,
      setTheme: (next) => {
        if (isValidTheme(next)) setThemeState(next);
      },
      // Toggle rápido claro <-> oscuro, para el atajo del navbar.
      toggleTheme: () =>
        setThemeState((prev) => (getThemeMeta(prev)?.dark ? "light" : "dark")),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme debe usarse dentro de ThemeProvider");
  }
  return ctx;
}
