// src/pages/Contact.jsx
import { useState } from "react";
import { Mail, User, MessageSquare, Send, MapPin, Clock, Phone } from "lucide-react";
import { sendContactMessage } from "../services/api";

// ✅ NUEVO
import { useToast } from "../context/ToastContext";
import LoadingOverlay from "../components/LoadingOverlay";

function Contact() {
  // ✅ NUEVO
  const { showToast } = useToast();

  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleFilesChange(e) {
    setFiles(Array.from(e.target.files || []));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");

    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("email", form.email);
      fd.append("subject", form.subject);
      fd.append("message", form.message);

      files.forEach((f) => fd.append("files", f));

      await sendContactMessage(fd);

      setStatus("sent");
      setForm({ name: "", email: "", subject: "", message: "" });
      setFiles([]);
      e.target.reset();

      // ✅ NUEVO: toast éxito
      showToast({
        type: "success",
        title: "Mensaje enviado",
        message: "¡Gracias! Te vamos a responder a la brevedad.",
      });

      // opcional: volver a idle después de un rato
      window.setTimeout(() => setStatus("idle"), 800);
    } catch (err) {
      console.error(err);
      setStatus("error");

      // ✅ NUEVO: toast error (si tu api tira err.message, lo usamos)
      showToast({
        type: "error",
        title: "No se pudo enviar",
        message: err?.message || "Ocurrió un error al enviar tu mensaje. Probá de nuevo.",
      });

      window.setTimeout(() => setStatus("idle"), 800);
    }
  }

  return (
    <main className="home-section contact-page">
      {/* ✅ NUEVO: overlay de carga sin mover layout */}
      <LoadingOverlay open={status === "sending"} label="Enviando mensaje..." />

      <header className="page-header--v2 card-animate">
        <div className="page-title-wrap--v2">
          <div>
            <div className="page-badge--v2">
              <MessageSquare size={18} className="icon" />
              Contacto
            </div>

            <h1 className="page-title--v2">Contáctanos</h1>
            <p className="page-subtitle--v2">
              ¿Tenés dudas sobre un producto o querés un presupuesto? Escribinos.
            </p>
          </div>
        </div>
      </header>

      <div className="grid-2">
        <form className="card-v2 card-pad form-grid card-animate" onSubmit={handleSubmit}>
          <div className="badge">
            <Mail size={16} className="icon" />
            Contacto
          </div>

          <div className="field">
            <label><User size={16} className="icon muted" /> Nombre</label>
            <input
              className="input-v2"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field">
            <label><Mail size={16} className="icon muted" /> Email</label>
            <input
              className="input-v2"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field">
            <label><MessageSquare size={16} className="icon muted" /> Asunto</label>
            <input
              className="input-v2"
              type="text"
              name="subject"
              value={form.subject}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field">
            <label><MessageSquare size={16} className="icon muted" /> Mensaje</label>
            <textarea
              className="textarea-v2"
              name="message"
              rows="4"
              value={form.message}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field">
            <label>Adjuntos (comprobante / fotos)</label>
            <input
              className="input-v2"
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFilesChange}
            />
            <small className="muted">Imágenes o PDF. Máx 8MB total.</small>
          </div>

          <button
            type="submit"
            className="btn-primary btn-icon btn-auto"
            disabled={status === "sending"}
          >
            <Send size={18} className="icon" />
            {status === "sending" ? "Enviando..." : "Enviar mensaje"}
          </button>

          {/* 🔻 Recomendado: NO mostrar mensajes inline para que no mueva el contenedor */}
          {/*
          {status === "sent" && <p className="form-success">¡Gracias! Te vamos a responder a la brevedad.</p>}
          {status === "error" && <p className="form-error">Ocurrió un error al enviar tu mensaje. Probá de nuevo.</p>}
          */}
        </form>

        <aside className="card-v2 card-pad item-hover card-animate">
          <div className="badge">
            <MapPin size={16} className="icon" />
            Datos del local
          </div>

          <p style={{ marginTop: ".75rem" }}>
            <strong>Dirección:</strong> (acá va la dirección real de Abul Cells)
          </p>
          <p>
            <strong>Horario:</strong> <Clock size={16} className="icon muted" /> Lunes a viernes de 10 a 19 hs.
          </p>
          <p><strong>Email:</strong> contacto@abulcells.com</p>
          <p>
            <strong>Teléfono:</strong> <Phone size={16} className="icon muted" /> +54 11 0000-0000
          </p>
        </aside>
      </div>
    </main>
  );
}

export default Contact;
