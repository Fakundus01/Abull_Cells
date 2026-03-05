import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AuthRouteLoading() {
  return (
    <main className="auth-route-loading" aria-live="polite" aria-busy="true">
      <div className="auth-route-loading-card card">
        <div className="auth-route-loading-spinner" />
        <p>Cargando tu sesión...</p>
      </div>
    </main>
  );
}

export function RequireAuth() {
  const { isAuthenticated, loadingAuth } = useAuth();
  const loc = useLocation();

  if (loadingAuth) return <AuthRouteLoading />;
  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(loc.pathname)}`}
        replace
      />
    );
  }
  return <Outlet />;
}

export function RequireAdmin() {
  const { isAuthenticated, isAdmin, loadingAuth } = useAuth();
  const loc = useLocation();

  if (loadingAuth) return <AuthRouteLoading />;
  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(loc.pathname)}`}
        replace
      />
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  return <Outlet />;
}