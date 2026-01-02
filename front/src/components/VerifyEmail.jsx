import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { verifyEmailToken } from "../services/api";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");

  const [status, setStatus] = useState("loading"); // loading | ok | error
  const [error, setError] = useState("");

  useEffect(() => {
    async function run() {
      try {
        if (!token) {
          setStatus("error");
          setError("Token faltante");
          return;
        }
        await verifyEmailToken(token);
        setStatus("ok");
        setTimeout(() => navigate("/perfil"), 800);
      } catch (e) {
        setStatus("error");
        setError(e.message || "No se pudo verificar");
      }
    }
    run();
  }, [token, navigate]);

  return (
    <main className="auth-page">
      <section className="auth-card card-animate">
        <h1 className="auth-title">Verificación de email</h1>

        {status === "loading" && <p className="auth-subtitle">Verificando...</p>}
        {status === "ok" && <p className="auth-subtitle">✅ Email verificado. Redirigiendo…</p>}
        {status === "error" && <p className="form-error">❌ {error}</p>}
      </section>
    </main>
  );
}