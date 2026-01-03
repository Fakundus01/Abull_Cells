import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UserPlus, Mail, Lock, User, ArrowRight, Eye, EyeOff } from "lucide-react";
import { register } from "../services/api";

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
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const emailOk = useMemo(() => {
    const email = String(form.email || "").trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, [form.email]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError("Completá todos los campos obligatorios.");
      return;
    }

    if (!emailOk) {
      setError("Ingresá un email válido.");
      return;
    }

    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setStatus("loading");

       await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      // backend setea cookies + devuelve user
      navigate("/verify-email");
    } catch (err) {
      setError(err?.message || "Ocurrió un error al crear la cuenta.");
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
            </div>
          </label>

          <label className="auth-label">
            Contraseña
            <div className="input-with-icon">
              <Lock size={16} className="icon muted" />
              <input
                type={showPass ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
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
                type={showConfirmPass ? "text" : "password"}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Repetí tu contraseña"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPass((v) => !v)}
                aria-label={showConfirmPass ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
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
