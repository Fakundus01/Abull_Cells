import { Navigate, Outlet, useLocation } from "react-router-dom";
import AppLoader from "../components/AppLoader";
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

export function RequireAuth() {
  const { isAuthenticated, loadingAuth } = useAuth();
  const location = useLocation();

  if (loadingAuth) {
    return <AppLoader variant="page" label="Cargando tu sesion..." />;
  }

  if (!isAuthenticated) {
    const requested = buildCurrentTarget(location);
    return <Navigate to={`/login?next=${encodeURIComponent(requested)}`} replace />;
  }

  return <Outlet />;
}

export function RequireAdmin() {
  const { isAuthenticated, isAdmin, loadingAuth } = useAuth();
  const location = useLocation();

  if (loadingAuth) {
    return <AppLoader variant="page" label="Validando acceso..." />;
  }

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

  if (loadingAuth) {
    return <AppLoader variant="page" label="Preparando acceso..." />;
  }

  if (isAuthenticated) {
    const params = new URLSearchParams(location.search);
    const nextTarget = sanitizeNextTarget(params.get("next"));
    return <Navigate to={nextTarget || "/perfil"} replace />;
  }

  return <Outlet />;
}
