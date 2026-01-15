// src/pages/Signup.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, User, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { register } from "../services/api";
import { useToast } from "../context/ToastContext";
import LoadingOverlay from "../components/LoadingOverlay";

function Signup() {
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
        title: "Contraseñas distintas",
        message: "Las contraseñas no coinciden",
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
        title: "Cuenta creada",
        message: "Tu cuenta fue creada correctamente. Ahora podés iniciar sesión.",
      });

      navigate("/login");
    } catch (err) {
      showToast({
        type: "error",
        title: "Error al registrarse",
        message: err?.message || "No se pudo crear la cuenta",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <LoadingOverlay open={loading} label="Creando cuenta..." />

      <section className="auth-card card-animate">
        <header className="auth-header">
          <div className="auth-badge">
            <UserPlus size={16} className="icon" />
            Crear cuenta
          </div>

          <h1 className="auth-title">Crear cuenta</h1>
          <p className="auth-subtitle">
            Registrate para seguir tus compras en Abul Cells.
          </p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label">Nombre</label>
          <div className="input-with-icon input-with-icon--auth">
            <User size={16} className="icon muted" />
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Tu nombre"
              required
            />
          </div>

          <label className="auth-label">Email</label>
          <div className="input-with-icon input-with-icon--auth">
            <Mail size={16} className="icon muted" />
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              autoComplete="email"
              required
            />
          </div>

          <label className="auth-label">Contraseña</label>
          <div className="input-with-icon input-with-icon--auth">
            <Lock size={16} className="icon muted" />
            <input
              type={showPass ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
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

          <label className="auth-label">Repetir contraseña</label>
          <div className="input-with-icon input-with-icon--auth">
            <Lock size={16} className="icon muted" />
            <input
              type={showRepeatPass ? "text" : "password"}
              name="repeatPassword"
              value={form.repeatPassword}
              onChange={handleChange}
              placeholder="Repetí tu contraseña"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowRepeatPass((v) => !v)}
              aria-label={showRepeatPass ? "Ocultar contraseña" : "Mostrar contraseña"}
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
                Registrando...
              </>
            ) : (
              "Registrarse"
            )}
          </button>

          <p className="auth-footnote">
            ¿Ya tenés una cuenta? <Link to="/login">Iniciá sesión</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default Signup;
