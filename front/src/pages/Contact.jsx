// src/pages/Contact.jsx
import { useState } from "react";
import { Mail, User, MessageSquare, Send, MapPin, Clock, Phone } from "lucide-react";
import { sendContactMessage } from "../services/api";

function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [files, setFiles] = useState([]); // ✅ NUEVO
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleFilesChange(e) { // ✅ NUEVO
    setFiles(Array.from(e.target.files || []));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");

    try {
      // ✅ Enviar multipart con FormData
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("email", form.email);
      fd.append("subject", form.subject);
      fd.append("message", form.message);

      // "files" repetido => lista en backend: request.files.getlist("files")
      files.forEach((f) => fd.append("files", f));

      await sendContactMessage(fd);

      setStatus("sent");
      setForm({ name: "", email: "", subject: "", message: "" });
      setFiles([]);
      e.target.reset(); // ✅ limpia inputs, incluido file
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }

  return (
    <main className="home-section contact-page">
      <header className="contact-head card-animate">
        <div className="contact-badge">
          <MessageSquare size={18} className="icon" />
          Contacto
        </div>
        <h1 className="contact-title">Contáctanos</h1>
        <p className="section-subtitle">
          ¿Tenés dudas sobre un producto o querés un presupuesto? Escribinos.
        </p>
      </header>

      <div className="grid-2">
        <form className="card-v2 card-pad form-grid card-animate" onSubmit={handleSubmit}>
          <div className="badge">
            <Mail size={16} className="icon" />
            Contacto
          </div>

          <div className="field">
            <label><User size={16} className="icon muted" /> Nombre</label>
            <input className="input-v2" type="text" name="name" value={form.name} onChange={handleChange} required />
          </div>

          <div className="field">
            <label><Mail size={16} className="icon muted" /> Email</label>
            <input className="input-v2" type="email" name="email" value={form.email} onChange={handleChange} required />
          </div>

          <div className="field">
            <label><MessageSquare size={16} className="icon muted" /> Asunto</label>
            <input className="input-v2" type="text" name="subject" value={form.subject} onChange={handleChange} required />
          </div>

          <div className="field">
            <label><MessageSquare size={16} className="icon muted" /> Mensaje</label>
            <textarea className="textarea-v2" name="message" rows="4" value={form.message} onChange={handleChange} required />
          </div>

          {/* ✅ NUEVO: Adjuntos */}
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

          <button type="submit" className="btn-primary btn-icon btn-auto" disabled={status === "sending"}>
            <Send size={18} className="icon" />
            {status === "sending" ? "Enviando..." : "Enviar mensaje"}
          </button>

          {status === "sent" && <p className="form-success">¡Gracias! Te vamos a responder a la brevedad.</p>}
          {status === "error" && <p className="form-error">Ocurrió un error al enviar tu mensaje. Probá de nuevo.</p>}
        </form>

        <aside className="card-v2 card-pad item-hover card-animate">
          <div className="badge">
            <MapPin size={16} className="icon" />
            Datos del local
          </div>

          <p style={{ marginTop: ".75rem" }}>
            <strong>Dirección:</strong> (acá va la dirección real de Abul Cells)
          </p>
          <p><strong>Horario:</strong> <Clock size={16} className="icon muted" /> Lunes a viernes de 10 a 19 hs.</p>
          <p><strong>Email:</strong> contacto@abulcells.com</p>
          <p><strong>Teléfono:</strong> <Phone size={16} className="icon muted" /> +54 11 0000-0000</p>
        </aside>
      </div>
    </main>
  );
}

export default Contact;
