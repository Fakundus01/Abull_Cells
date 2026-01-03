import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../services/api";
import { Lock, ArrowRight, Loader2, CheckCircle2, AlertTriangle, Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const token = useMemo(() => params.get("token") || "", [params]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [status, setStatus] = useState("idle"); // idle | loading | success
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Token inválido o faltante. Volvé a pedir el link.");
      return;
    }

    if (!password || password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setStatus("loading");
      await resetPassword({ token, password });
      setStatus("success");

      // redirigir al login luego de un momento corto
      setTimeout(() => navigate("/login"), 800);
    } catch (err) {
      setError(err?.message || "No se pudo cambiar la contraseña.");
      setStatus("idle");
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card card-animate">
        <h1 className="auth-title">Nueva contraseña</h1>
        <p className="auth-subtitle">
          Ingresá tu nueva contraseña y confirmala.
        </p>

        {status === "success" ? (
          <div className="alert-success" role="status">
            <CheckCircle2 size={16} className="icon" />
            <div>
              <strong>Contraseña actualizada.</strong>
              <div className="form-hint">Te redirigimos al login…</div>
            </div>
          </div>
        ) : (
          <>
            {!token && (
              <div className="alert-error" role="alert">
                <AlertTriangle size={16} className="icon" />
                <span>Falta el token. Pedí nuevamente el link de recuperación.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <label className="auth-label">
                Nueva contraseña
                <div className="input-with-icon">
                  <Lock size={16} className="icon muted" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
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
              </label>

              <label className="auth-label">
                Repetir contraseña
                <div className="input-with-icon">
                  <Lock size={16} className="icon muted" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repetí tu contraseña"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              {error && (
                <div className="alert-error" role="alert">
                  <AlertTriangle size={16} className="icon" />
                  <span>{error}</span>
                </div>
              )}

              <button className="btn-primary btn-icon" type="submit" disabled={status === "loading" || !token}>
                {status === "loading" ? (
                  <>
                    <Loader2 size={18} className="icon spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <ArrowRight size={18} className="icon" />
                    Cambiar contraseña
                  </>
                )}
              </button>

              <p className="auth-footer">
                <Link className="link-inline--v2" to="/login">
                  Volver al login
                </Link>
                {" · "}
                <Link className="link-inline--v2" to="/forgot-password">
                  Pedir link de nuevo
                </Link>
              </p>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
