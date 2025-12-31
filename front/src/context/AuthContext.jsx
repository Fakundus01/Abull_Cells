import { createContext, useContext, useEffect, useState } from "react";
import { fetchMe, logout} from "../services/api"; // la creamos abajo

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
  (async () => {
    try {
      const u = await fetchMe();
      setUser(u);
    } catch {
      setUser(null);
    }
  })();
}, []);

  function saveSession(user) {
    setUser(user); // listo
  }

  async function clearSession() {
  try {
    await logout();
  } catch (e) {
    // si falla igual limpiamos el front
  }
  setUser(null);
  setToken(null);
  localStorage.removeItem("user");
}

  const isAuthenticated = !!user;
  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, isAdmin, loadingAuth, saveSession, clearSession }}
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
