// src/context/themes.js
// Catálogo de temas. Vive aparte de ThemeContext.jsx para no romper el fast
// refresh, que exige que un archivo de componentes exporte solo componentes.

/**
 * Cada tema tiene su bloque [data-theme="id"] en styles.css.
 * `swatch` son los colores del preview del selector: [fondo, superficie, acento].
 */
export const THEMES = [
  { id: "light", dark: false, swatch: ["#ffffff", "#f1f5f9", "#0ea5e9"] },
  { id: "dark", dark: true, swatch: ["#0b1120", "#1f2937", "#38bdf8"] },
  { id: "midnight", dark: true, swatch: ["#0a0a14", "#1f1f36", "#a78bfa"] },
  { id: "forest", dark: true, swatch: ["#08120e", "#1a3128", "#34d399"] },
  { id: "sunset", dark: true, swatch: ["#140d0a", "#38251d", "#fb923c"] },
];

export const DEFAULT_THEME = "dark";

const THEME_IDS = THEMES.map((t) => t.id);

export function isValidTheme(value) {
  return THEME_IDS.includes(value);
}

export function getThemeMeta(id) {
  return THEMES.find((t) => t.id === id);
}
