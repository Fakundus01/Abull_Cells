import { createContext, useContext, useEffect, useState } from "react";
import { fetchMe, logout } from "../services/api";

const AuthContext = createContext(null);

const AUTH_BOOT_TIMEOUT_MS = 8000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const boot = async () => {
      try {
        const timeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("AUTH_BOOT_TIMEOUT")), AUTH_BOOT_TIMEOUT_MS);
        });

        const u = await Promise.race([fetchMe(), timeout]);
        if (!isCancelled) setUser(u);
      } catch {
        if (!isCancelled) setUser(null);
      } finally {
        if (!isCancelled) setLoadingAuth(false);
      }
    };

    boot();

    return () => {
      isCancelled = true;
    };
  }, []);

  function saveSession(nextUser) {
    setUser(nextUser || null);
    setLoadingAuth(false);
  }

  async function clearSession() {
    try {
      await logout();
    } catch {
      // Si falla igual limpiamos estado local.
    }
    setUser(null);
    setLoadingAuth(false);
    localStorage.removeItem("user");
  }

  async function refreshUser() {
    try {
      const me = await fetchMe();
      setUser(me);
      setLoadingAuth(false);
      return me;
    } catch {
      setUser(null);
      setLoadingAuth(false);
      return null;
    }
  }

  const isAuthenticated = !!user;
  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        loadingAuth,
        saveSession,
        clearSession,
        logout: clearSession,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}