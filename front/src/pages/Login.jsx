// src/pages/Login.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";
import { login } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import LoadingOverlay from "../components/LoadingOverlay";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failCount, setFailCount] = useState(0);

  const { saveSession, refreshUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    try {
      const data = await login(email, password);
      saveSession(data);
      await refreshUser();

      showToast({
        type: "success",
        title: "Sesión iniciada",
        message: "Bienvenido nuevamente " + email,
      });

      navigate("/admin");
    } catch (err) {
      setFailCount((n) => n + 1);

      showToast({
        type: "error",
        title: "Error al iniciar sesión",
        message: err?.message || "Email o contraseña incorrectos",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <LoadingOverlay open={loading} label="Ingresando..." />

      <section className="auth-card card-animate">
        <header className="auth-header">
          <div className="auth-badge">
            <ShieldCheck size={16} className="icon" />
            Login seguro
          </div>

          <h1 className="auth-title">Iniciar sesión</h1>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label">Email</label>
          <div className="input-with-icon input-with-icon--auth">
            <Mail size={16} className="icon muted" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              required
            />
          </div>

          <label className="auth-label">Contraseña</label>
          <div className="input-with-icon input-with-icon--auth">
            <Lock size={16} className="icon muted" />
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPass((v) => !v)}
              aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {failCount >= 5 && (
            <div className="auth-help">
              <p className="form-hint">
                ¿No podés entrar? Probá recuperar tu contraseña.
              </p>
              <Link
                to={`/forgot-password?email=${encodeURIComponent(email || "")}`}
                className="link-inline--v2"
              >
                Recuperar contraseña
              </Link>
            </div>
          )}

          <button
            className="btn-primary btn-icon auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="icon spin" />
                Ingresando...
              </>
            ) : (
              "Ingresar"
            )}
          </button>

          <p className="auth-footnote">
            ¿No tenés cuenta? <Link to="/signup">Crear cuenta</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default Login;
