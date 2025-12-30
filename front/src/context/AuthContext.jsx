import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // { id, name, email, role }
  const [token, setToken] = useState(null);     // JWT

  useEffect(() => {
    const saved = localStorage.getItem("abul_auth");
    if (saved) {
      const parsed = JSON.parse(saved);
      setUser(parsed.user);
      setToken(parsed.token);
    }
  }, []);

  function saveSession(user, accessToken) {
  setUser(user);
  setToken(accessToken);

  localStorage.setItem("access_token", accessToken);
  localStorage.setItem("user", JSON.stringify(user));
}

  function clearSession() {
    setUser(null);
    setToken(null);
    localStorage.removeItem("abul_auth");
  }

  const isAuthenticated = !!user;
  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated, isAdmin, saveSession, clearSession }}
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
