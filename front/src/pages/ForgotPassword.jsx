import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { forgotPassword } from "../services/api";
import { Mail, ArrowRight, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export default function ForgotPassword() {
  const { t } = useLanguage();
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
      setError(t("auth.forgotPassword.errors.missingEmail"));
      return;
    }

    try {
      setStatus("loading");
      await forgotPassword({ email: clean });
      setStatus("success");
    } catch (err) {
      setError(err?.message || t("auth.forgotPassword.errors.generic"));
      setStatus("idle");
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card card-animate">
        <h1 className="auth-title">{t("auth.forgotPassword.title")}</h1>
        <p className="auth-subtitle">
          {t("auth.forgotPassword.subtitle")}
        </p>

        {status === "success" ? (
          <div className="alert-success" role="status">
            <CheckCircle2 size={16} className="icon" />
            <div>
              <strong>{t("auth.forgotPassword.successTitle")}</strong>
              <div className="form-hint">
                {t("auth.forgotPassword.successMessage")}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <Link to="/login" className="btn-secondary btn-icon">
                <ArrowRight size={18} className="icon" />
                {t("auth.forgotPassword.backToLogin")}
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-label">
               {t("auth.forgotPassword.emailLabel")}
              <div className="input-with-icon">
                <Mail size={16} className="icon muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.forgotPassword.emailPlaceholder")}
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
                   {t("auth.forgotPassword.sending")}
                </>
              ) : (
                <>
                  <ArrowRight size={18} className="icon" />
                  {t("auth.forgotPassword.submit")}
                </>
              )}
            </button>

            <p className="auth-footer">
              <Link className="link-inline--v2" to="/login">
                {t("auth.forgotPassword.backToLogin")}
              </Link>
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
