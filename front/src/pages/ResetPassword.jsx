import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../services/api";
import { Lock, ArrowRight, Loader2, CheckCircle2, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export default function ResetPassword() {
  const { t } = useLanguage();
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
      setError(t("auth.resetPassword.errors.missingToken"));
      return;
    }

    if (!password || password.length < 8) {
      setError(t("auth.resetPassword.errors.shortPassword"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.resetPassword.errors.passwordMismatch"));
      return;
    }

    try {
      setStatus("loading");
      await resetPassword({ token, password });
      setStatus("success");

      // redirigir al login luego de un momento corto
      setTimeout(() => navigate("/login"), 800);
    } catch (err) {
      setError(err?.message || t("auth.resetPassword.errors.generic"));
      setStatus("idle");
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card card-animate">
        <h1 className="auth-title">{t("auth.resetPassword.title")}</h1>
        <p className="auth-subtitle">
          {t("auth.resetPassword.subtitle")}
        </p>

        {status === "success" ? (
          <div className="alert-success" role="status">
            <CheckCircle2 size={16} className="icon" />
            <div>
              <strong>{t("auth.resetPassword.successTitle")}</strong>
              <div className="form-hint">{t("auth.resetPassword.successMessage")}</div>
            </div>
          </div>
        ) : (
          <>
            {!token && (
              <div className="alert-error" role="alert">
                <AlertTriangle size={16} className="icon" />
                <span>{t("auth.resetPassword.errors.missingTokenInline")}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <label className="auth-label">
                {t("auth.resetPassword.passwordLabel")}
                <div className="input-with-icon">
                  <Lock size={16} className="icon muted" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.resetPassword.passwordPlaceholder")}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? t("auth.resetPassword.hidePassword") : t("auth.resetPassword.showPassword")}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <label className="auth-label">
                {t("auth.resetPassword.confirmPasswordLabel")}
                <div className="input-with-icon">
                  <Lock size={16} className="icon muted" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("auth.resetPassword.confirmPasswordPlaceholder")}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? t("auth.resetPassword.hidePassword") : t("auth.resetPassword.showPassword")}
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
                    {t("auth.resetPassword.saving")}
                  </>
                ) : (
                  <>
                    <ArrowRight size={18} className="icon" />
                    {t("auth.resetPassword.submit")}
                  </>
                )}
              </button>

              <p className="auth-footer">
                <Link className="link-inline--v2" to="/login">
                  {t("auth.resetPassword.backToLogin")}
                </Link>
                {" · "}
                <Link className="link-inline--v2" to="/forgot-password">
                  {t("auth.resetPassword.requestLink")}
                </Link>
              </p>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
