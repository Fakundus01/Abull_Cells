import AppLoader from "./AppLoader";

export default function LoadingOverlay({ open, label = "Cargando..." }) {
  if (!open) return null;

  return (
    <div className="loading-overlay" role="presentation">
      <AppLoader variant="card" label={label} className="loading-overlay-card" />
    </div>
  );
}
