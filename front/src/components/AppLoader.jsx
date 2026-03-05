import { Loader2 } from "lucide-react";

export default function AppLoader({
  label = "Cargando...",
  variant = "page",
  className = "",
}) {
  if (variant === "nav") {
    return (
      <div className={`app-loader app-loader--nav ${className}`.trim()} aria-hidden="true">
        <span className="app-loader-pill" />
        <span className="app-loader-pill" />
        <span className="app-loader-avatar" />
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <span className={`app-loader app-loader--inline ${className}`.trim()} role="status" aria-live="polite">
        <Loader2 size={16} className="icon spin" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }

  if (variant === "card") {
    return (
      <div className={`app-loader app-loader--card ${className}`.trim()} role="status" aria-live="polite">
        <Loader2 size={20} className="icon spin" aria-hidden="true" />
        <span>{label}</span>
      </div>
    );
  }

  return (
    <main className={`app-loader app-loader--page ${className}`.trim()} aria-live="polite" aria-busy="true">
      <div className="app-loader-card card">
        <Loader2 size={20} className="icon spin" aria-hidden="true" />
        <p>{label}</p>
      </div>
    </main>
  );
}
