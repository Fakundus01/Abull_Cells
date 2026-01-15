import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function RequireAuth() {
  const { isAuthenticated, loadingAuth } = useAuth();
  const loc = useLocation();

  if (loadingAuth) return null; // o tu loader
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

  if (loadingAuth) return null;
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
