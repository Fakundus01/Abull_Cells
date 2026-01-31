// src/pages/Login.jsx
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Loader2 } from "lucide-react";
import { login } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import LoadingOverlay from "../components/LoadingOverlay";
import { useLanguage } from "../context/LanguageContext";

function Login() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failCount, setFailCount] = useState(0);

  const { saveSession, refreshUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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
        title: t("auth.login.toastSuccessTitle"),
        message: t("auth.login.toastSuccessMessage", { email }),
      });

      const nextParam = searchParams.get("next");
      const target = nextParam && nextParam.startsWith("/") ? nextParam : "/perfil";
      navigate(target);
    } catch (err) {
      setFailCount((n) => n + 1);

      showToast({
        type: "error",
        title: t("auth.login.toastErrorTitle"),
        message: err?.message || t("auth.login.toastErrorMessage"),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <LoadingOverlay open={loading} label={t("auth.login.loading")} />

      <section className="auth-card card-animate">
        <header className="auth-header">
          <div className="auth-badge">
            <ShieldCheck size={16} className="icon" />
            {t("auth.login.secureBadge")}
          </div>

          <h1 className="auth-title">{t("auth.login.title")}</h1>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label">{t("auth.login.emailLabel")}</label>
          <div className="input-with-icon input-with-icon--auth">
            <Mail size={16} className="icon muted" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.login.emailPlaceholder")}
              autoComplete="email"
              required
            />
          </div>

          <label className="auth-label">{t("auth.login.passwordLabel")}</label>
          <div className="input-with-icon input-with-icon--auth">
            <Lock size={16} className="icon muted" />
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.login.passwordPlaceholder")}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPass((v) => !v)}
              aria-label={showPass ? t("auth.login.hidePassword") : t("auth.login.showPassword")}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {failCount >= 5 && (
            <div className="auth-help">
              <p className="form-hint">
                {t("auth.login.recoverHint")}
              </p>
              <Link
                to={`/forgot-password?email=${encodeURIComponent(email || "")}`}
                className="link-inline--v2"
              >
                {t("auth.login.recoverLink")}
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
                {t("auth.login.loadingButton")}
              </>
            ) : (
              t("auth.login.submit")
            )}
          </button>

          <p className="auth-footnote">
             {t("auth.login.noAccount")} <Link to="/signup">{t("auth.login.signupLink")}</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default Login;
