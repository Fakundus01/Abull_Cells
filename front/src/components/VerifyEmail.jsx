import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowRight, RefreshCw } from "lucide-react";
import { confirmVerifyEmail, resendVerifyEmail } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth(); // si no existe refreshUser, te digo abajo
  const { t } = useLanguage();
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
      setError(t("auth.verifyEmail.errors.shortCode"));
      return;
    }

    try {
      setStatus("loading");
      await confirmVerifyEmail(code);

      // refrescar user en el contexto para que emailVerified cambie
      if (refreshUser) await refreshUser();

      navigate("/profile");
    } catch (e) {
      setError(e.message || t("auth.verifyEmail.errors.invalidCode"));
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
      setInfo(t("auth.verifyEmail.resendSuccess"));
    } catch (e) {
      setError(e.message || t("auth.verifyEmail.errors.resendFailed"));
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
            <h1 className="auth-title">{t("auth.verifyEmail.title")}</h1>
            <p className="auth-subtitle">
              {t("auth.verifyEmail.subtitle", { email: user?.email })}
            </p>
          </div>
        </div>

        <div className="auth-form">
          <label className="auth-label">
            {t("auth.verifyEmail.codeLabel")}
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("auth.verifyEmail.codePlaceholder")}
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
              {status === "loading" ? t("auth.verifyEmail.verifying") : (
                <>
                  {t("auth.verifyEmail.confirm")} <ArrowRight size={18} className="icon" />
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
              {t("auth.verifyEmail.resend")}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate("/perfil")}
            >
              {t("auth.verifyEmail.later")}
            </button>
          </div>

          <p className="auth-hint">
            {t("auth.verifyEmail.hint")} <strong>{t("auth.verifyEmail.profileLink")}</strong>.
          </p>
        </div>
      </section>
    </main>
  );
}
