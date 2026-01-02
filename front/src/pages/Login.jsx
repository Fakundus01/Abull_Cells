// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, Loader2, ShieldCheck } from "lucide-react";

function Login() {
  const [email, setEmail] = useState("facumoreno2001@gmail.com");
  const [password, setPassword] = useState("Kassadin01");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { saveSession } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login(email, password);
      saveSession(data.user, null); // o directamente sin token
      navigate("/admin");
    } catch (err) {
      setError(err.message);
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

          <label className="auth-label">Contraseña</label>
          <div className="input-with-icon input-with-icon--auth">
            <Lock size={16} className="icon muted" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className="form-error auth-error">{error}</p>}

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
