// src/components/ThemePicker.jsx
import { Check } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

/**
 * Selector de tema. Se usa en el drawer del navbar (disponible para cualquier
 * visitante, sin necesidad de cuenta) y en la página de perfil.
 */
export default function ThemePicker({ compact = false }) {
  const { theme, themes, setTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <div
      className={`theme-picker ${compact ? "theme-picker--compact" : ""}`}
      role="radiogroup"
      aria-label={t("profile.theme.picker")}
    >
      {themes.map((item) => {
        const isActive = item.id === theme;
        const label = t(`profile.theme.names.${item.id}`);
        const [bg, surface, accent] = item.swatch;

        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={`theme-swatch ${isActive ? "is-active" : ""}`}
            onClick={() => setTheme(item.id)}
            title={label}
          >
            <span className="theme-swatch-preview" aria-hidden="true">
              <span className="theme-swatch-bg" style={{ background: bg }} />
              <span className="theme-swatch-surface" style={{ background: surface }} />
              <span className="theme-swatch-accent" style={{ background: accent }} />
              {isActive && (
                <span className="theme-swatch-check">
                  <Check size={14} strokeWidth={3} />
                </span>
              )}
            </span>
            <span className="theme-swatch-label">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
