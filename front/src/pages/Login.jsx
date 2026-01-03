// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { LogIn, Mail, Lock, ArrowRight, Eye, EyeOff, ShieldCheck, Loader2  } from "lucide-react";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [failCount, setFailCount] = useState(0);

  const { saveSession } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login(email, password);
      setFailCount(0);
      saveSession(data.user, null); // o directamente sin token
      navigate("/admin");
    } catch (err) {
      setFailCount((c) => c + 1);
      setError(err?.message || "Credenciales inválidas.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card card-animate">
        <header className="auth-header">
          <div className="auth-badge">
            <ShieldCheck size={16} className="icon" />
            Acceso admin
          </div>

          <h1 className="auth-title">Iniciar sesión</h1>
          <p className="auth-subtitle">
            Usá tu cuenta para entrar al panel de administración.
          </p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label">Email</label>
          <div className="input-with-icon input-with-icon--auth">
            <Mail size={16} className="icon muted" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="facumoreno2001@gmail.com"
              required
              autoComplete="email"
            />
          </div>

          <label className="auth-label">Contraseña
          <div className="input-with-icon input-with-icon--auth">
            <Lock size={16} className="icon muted" />
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
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
          </label>

          {error && <p className="form-error auth-error">{error}</p>}
          {failCount >= 5 && (
          <div className="auth-help">
            <p className="form-hint">¿No podés entrar? Te conviene recuperar la contraseña.</p>
            <Link
              to={`/forgot-password?email=${encodeURIComponent(email || "")}`}
              className="link-inline--v2"
            >
              Recuperar contraseña
            </Link>
          </div>
        )}

          <button className="btn-primary btn-icon auth-submit" type="submit" disabled={loading}>
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
            ¿No tenés acceso? <Link to="/">Volver al inicio</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default Login;
