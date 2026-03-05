import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function sanitizeNextTarget(rawTarget) {
  if (!rawTarget || typeof rawTarget !== "string") return null;
  if (!rawTarget.startsWith("/")) return null;
  if (rawTarget.startsWith("//")) return null;
  return rawTarget;
}

function buildCurrentTarget(location) {
  return `${location.pathname}${location.search}${location.hash}`;
}

function GuardRouteLoading({ message = "Cargando sesion..." }) {
  return (
    <main className="auth-route-loading" aria-live="polite" aria-busy="true">
      <div className="auth-route-loading-card card">
        <div className="auth-route-loading-spinner" />
        <p>{message}</p>
      </div>
    </main>
  );
}

export function RequireAuth() {
  const { isAuthenticated, loadingAuth } = useAuth();
  const location = useLocation();

  if (loadingAuth) return <GuardRouteLoading message="Cargando tu sesion..." />;

  if (!isAuthenticated) {
    const requested = buildCurrentTarget(location);
    return <Navigate to={`/login?next=${encodeURIComponent(requested)}`} replace />;
  }

  return <Outlet />;
}

export function RequireAdmin() {
  const { isAuthenticated, isAdmin, loadingAuth } = useAuth();
  const location = useLocation();

  if (loadingAuth) return <GuardRouteLoading message="Validando acceso..." />;

  if (!isAuthenticated) {
    const requested = buildCurrentTarget(location);
    return <Navigate to={`/login?next=${encodeURIComponent(requested)}`} replace />;
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  return <Outlet />;
}

export function RequireGuest() {
  const { isAuthenticated, loadingAuth } = useAuth();
  const location = useLocation();

  if (loadingAuth) return <GuardRouteLoading message="Preparando acceso..." />;

  if (isAuthenticated) {
    const params = new URLSearchParams(location.search);
    const nextTarget = sanitizeNextTarget(params.get("next"));
    return <Navigate to={nextTarget || "/perfil"} replace />;
  }

  return <Outlet />;
}
