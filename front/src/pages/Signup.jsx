import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UserPlus, Mail, Lock, User, ArrowRight, BadgeCheck } from "lucide-react";

function getInitialCode() {
  // Mock: código de 6 dígitos
  return String(Math.floor(100000 + Math.random() * 900000));
}

function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [status, setStatus] = useState("idle"); // idle | loading
  const [error, setError] = useState("");

  // Email verification (mock)
  const [codeSent, setCodeSent] = useState(false);
  const [serverCode, setServerCode] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);

  const emailOk = useMemo(() => {
    const email = String(form.email || "").trim();
    // validación simple
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, [form.email]);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({ ...prev, [name]: value }));

    // Si cambia el email, reseteamos verificación
    if (name === "email") {
      setCodeSent(false);
      setServerCode("");
      setCodeInput("");
      setEmailVerified(false);
    }
  }

  function handleSendCode() {
    setError("");

    if (!emailOk) {
      setError("Ingresá un email válido para poder verificarlo.");
      return;
    }

    const code = getInitialCode();
    setServerCode(code);
    setCodeSent(true);

    // MOCK: en real lo enviás por backend/email provider
    console.log("[SIGNUP][mock] Código enviado a:", form.email, "code:", code);
  }

  function handleVerifyCode() {
    setError("");

    if (!codeSent) return;

    if (codeInput.trim() === serverCode) {
      setEmailVerified(true);
      return;
    }

    setEmailVerified(false);
    setError("El código no coincide. Revisá e intentá de nuevo.");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError("Completá todos los campos obligatorios.");
      return;
    }

    if (!emailVerified) {
      setError("Primero verificá tu email.");
      return;
    }

    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setStatus("loading");

      // ✅ MOCK por ahora (después lo conectamos al backend)
      await new Promise((r) => setTimeout(r, 700));

      navigate("/login");
    } catch (err) {
      setError("Ocurrió un error al crear la cuenta.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card card-animate">
        <div className="auth-header">
          <div className="auth-icon">
            <UserPlus size={18} className="icon" />
          </div>

          <div className="auth-header-text">
            <h1 className="auth-title">Crear cuenta</h1>
            <p className="auth-subtitle">
              Registrate para seguir tus compras en Abul Cells.
            </p>
          </div>

          {emailVerified && (
            <span className="verify-badge" title="Email verificado">
              <BadgeCheck size={16} className="icon" />
              Verificado
            </span>
          )}
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label">
            Nombre
            <div className="input-with-icon">
              <User size={16} className="icon muted" />
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Tu nombre"
                required
              />
            </div>
          </label>

          <label className="auth-label">
            Email
            <div className="auth-email-row">
              <div className="input-with-icon">
                <Mail size={16} className="icon muted" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="tu@email.com"
                  required
                />
              </div>

              <button
                type="button"
                className="btn-secondary btn-small"
                onClick={handleSendCode}
              >
                {codeSent ? "Reenviar" : "Verificar"}
              </button>
            </div>
          </label>

          {codeSent && !emailVerified && (
            <label className="auth-label">
              Código de verificación
              <div className="auth-code-row">
                <input
                  className="auth-code-input"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="Ingresá el código (6 dígitos)"
                />
                <button
                  type="button"
                  className="btn-secondary btn-small"
                  onClick={handleVerifyCode}
                >
                  Confirmar
                </button>
              </div>
              <p className="auth-hint">
                (Mock) El código se imprime en consola por ahora.
              </p>
            </label>
          )}

          <label className="auth-label">
            Contraseña
            <div className="input-with-icon">
              <Lock size={16} className="icon muted" />
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
          </label>

          <label className="auth-label">
            Repetir contraseña
            <div className="input-with-icon">
              <Lock size={16} className="icon muted" />
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Repetí tu contraseña"
                required
              />
            </div>
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="auth-actions">
            <button
              className="btn-primary btn-icon"
              type="submit"
              disabled={status === "loading"}
            >
              {status === "loading" ? "Creando..." : (
                <>
                  Registrarse <ArrowRight size={18} className="icon" />
                </>
              )}
            </button>
          </div>
        </form>

        <p className="auth-footer">
          ¿Ya tenés una cuenta creada?{" "}
          <Link to="/login" className="link-inline--v2">
            Iniciá sesión
          </Link>
        </p>
      </section>
    </main>
  );
}

export default Signup;
