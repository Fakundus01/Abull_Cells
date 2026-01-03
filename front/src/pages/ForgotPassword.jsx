import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { forgotPassword } from "../services/api";
import { Mail, ArrowRight, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

export default function ForgotPassword() {
  const [params] = useSearchParams();
  const initialEmail = params.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState("idle"); // idle | loading | success
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const clean = (email || "").trim().toLowerCase();
    if (!clean) {
      setError("Ingresá tu correo.");
      return;
    }

    try {
      setStatus("loading");
      await forgotPassword({ email: clean });
      setStatus("success");
    } catch (err) {
      setError(err?.message || "No se pudo procesar la solicitud.");
      setStatus("idle");
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card card-animate">
        <h1 className="auth-title">Recuperar contraseña</h1>
        <p className="auth-subtitle">
          Te vamos a mandar un link para que puedas crear una contraseña nueva.
        </p>

        {status === "success" ? (
          <div className="alert-success" role="status">
            <CheckCircle2 size={16} className="icon" />
            <div>
              <strong>Listo.</strong>
              <div className="form-hint">
                Si el mail existe, te va a llegar un correo con el link de recuperación.
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <Link to="/login" className="btn-secondary btn-icon">
                <ArrowRight size={18} className="icon" />
                Volver al login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-label">
              Email
              <div className="input-with-icon">
                <Mail size={16} className="icon muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                />
              </div>
            </label>

            {error && (
              <div className="alert-error" role="alert">
                <AlertTriangle size={16} className="icon" />
                <span>{error}</span>
              </div>
            )}

            <button className="btn-primary btn-icon" type="submit" disabled={status === "loading"}>
              {status === "loading" ? (
                <>
                  <Loader2 size={18} className="icon spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <ArrowRight size={18} className="icon" />
                  Enviar link
                </>
              )}
            </button>

            <p className="auth-footer">
              <Link className="link-inline--v2" to="/login">
                Volver al login
              </Link>
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
