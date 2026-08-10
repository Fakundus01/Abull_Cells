// src/pages/Signup.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, User, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { register } from "../services/api";
import { useToast } from "../context/ToastContext";
import LoadingOverlay from "../components/LoadingOverlay";
import { useLanguage } from "../context/LanguageContext";

function Signup() {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    repeatPassword: "",
  });

  const [showPass, setShowPass] = useState(false);
  const [showRepeatPass, setShowRepeatPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;

    if (form.password !== form.repeatPassword) {
      showToast({
        type: "error",
        title: t("auth.signup.passwordMismatchTitle"),
        message: t("auth.signup.passwordMismatchMessage"),
      });
      return;
    }

    setLoading(true);

    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
      });

      showToast({
        type: "success",
        title: t("auth.signup.successTitle"),
        message: t("auth.signup.successMessage"),
      });

      navigate("/login");
    } catch (err) {
      showToast({
        type: "error",
        title: t("auth.signup.errorTitle"),
        message: err?.message || t("auth.signup.errorMessage"),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <LoadingOverlay open={loading} label={t("auth.signup.loading")} />

      <section className="auth-card card-animate">
        <header className="auth-header">
          <div className="auth-badge">
            <UserPlus size={16} className="icon" />
            {t("auth.signup.badge")}
          </div>

          <h1 className="auth-title">{t("auth.signup.title")}</h1>
          <p className="auth-subtitle">
           {t("auth.signup.subtitle")}
          </p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label">{t("auth.signup.nameLabel")}</label>
          <div className="input-with-icon input-with-icon--auth">
            <User size={16} className="icon muted" />
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder={t("auth.signup.namePlaceholder")}
              required
            />
          </div>

          <label className="auth-label">{t("auth.signup.emailLabel")}</label>
          <div className="input-with-icon input-with-icon--auth">
            <Mail size={16} className="icon muted" />
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder={t("auth.signup.emailPlaceholder")}
              autoComplete="email"
              required
            />
          </div>

          <label className="auth-label">{t("auth.signup.passwordLabel")}</label>
          <div className="input-with-icon input-with-icon--auth">
            <Lock size={16} className="icon muted" />
            <input
              type={showPass ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder={t("auth.signup.passwordPlaceholder")}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPass((v) => !v)}
              aria-label={showPass ? t("auth.signup.hidePassword") : t("auth.signup.showPassword")}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <label className="auth-label">{t("auth.signup.repeatPasswordLabel")}</label>
          <div className="input-with-icon input-with-icon--auth">
            <Lock size={16} className="icon muted" />
            <input
              type={showRepeatPass ? "text" : "password"}
              name="repeatPassword"
              value={form.repeatPassword}
              onChange={handleChange}
              placeholder={t("auth.signup.repeatPasswordPlaceholder")}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowRepeatPass((v) => !v)}
              aria-label={showRepeatPass ? t("auth.signup.hidePassword") : t("auth.signup.showPassword")}
            >
              {showRepeatPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button
            className="btn-primary btn-icon auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="icon spin" />
                {t("auth.signup.loadingButton")}
              </>
            ) : (
              t("auth.signup.submit")
            )}
          </button>

          <p className="auth-footnote">
            {t("auth.signup.haveAccount")} <Link to="/login">{t("auth.signup.loginLink")}</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default Signup;
