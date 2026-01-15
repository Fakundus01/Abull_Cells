import { Loader2 } from "lucide-react";

export default function LoadingOverlay({ open, label = "Cargando..." }) {
  if (!open) return null;

  return (
    <div className="loading-overlay" role="presentation">
      <div className="loading-overlay-card" role="status" aria-live="polite">
        <Loader2 size={20} className="icon spin" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </div>
  );
}
