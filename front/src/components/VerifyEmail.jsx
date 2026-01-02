import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, Mail, ArrowRight, RefreshCw } from "lucide-react";
import { confirmVerifyEmail, sendVerifyEmail, fetchMe, resendVerifyEmail } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth(); // si no existe refreshUser, te digo abajo
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    // si ya está verificado, mandalo al perfil
    if (user?.emailVerified) navigate("/perfil");
  }, [user, navigate]);

  async function onConfirm() {
    setError("");
    setInfo("");

    const clean = String(code || "").trim();
    if (clean.length < 6) {
      setError("Ingresá el código de 6 dígitos.");
      return;
    }

    try {
      setStatus("loading");
      await confirmVerifyEmail(code);

      // refrescar user en el contexto para que emailVerified cambie
      if (refreshUser) await refreshUser();

      navigate("/profile");
    } catch (e) {
      setError(e.message || "Código inválido.");
    } finally {
      setStatus("idle");
    }
  }

  async function onResend() {
    setError("");
    setInfo("");
    try {
      setStatus("loading");
      await resendVerifyEmail();
      setInfo("Listo ✅ Te enviamos un nuevo código.");
    } catch (e) {
      setError(e.message || "No se pudo reenviar.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card card-animate">
        <div className="auth-header">
          <div className="auth-icon">
            <Mail size={18} className="icon" />
          </div>
          <div className="auth-header-text">
            <h1 className="auth-title">Verificá tu email</h1>
            <p className="auth-subtitle">
              Te enviamos un código a <strong>{user?.email}</strong>.
            </p>
          </div>
        </div>

        <div className="auth-form">
          <label className="auth-label">
            Código (6 dígitos)
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              inputMode="numeric"
            />
          </label>

          {error && <p className="form-error">{error}</p>}
          {info && <p className="form-success">{info}</p>}

          <div className="auth-actions" style={{ gap: 10 }}>
            <button
              type="button"
              className="btn-primary btn-icon"
              onClick={onConfirm}
              disabled={status === "loading"}
            >
              {status === "loading" ? "Verificando..." : (
                <>
                  Confirmar <ArrowRight size={18} className="icon" />
                </>
              )}
            </button>

            <button
              type="button"
              className="btn-secondary btn-icon"
              onClick={onResend}
              disabled={status === "loading"}
            >
              <RefreshCw size={18} className="icon" />
              Reenviar código
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate("/perfil")}
            >
              Verificar más tarde
            </button>
          </div>

          <p className="auth-hint">
            Podés verificarlo más tarde desde <strong>Mi perfil</strong>.
          </p>
        </div>
      </section>
    </main>
  );
}
