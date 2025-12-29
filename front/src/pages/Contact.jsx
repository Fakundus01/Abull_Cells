// src/pages/Contact.jsx
import { useState } from "react";
import { Mail, User, MessageSquare, Send, MapPin, Clock, Phone } from "lucide-react";

function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");

    try {
      console.log("[CONTACTO] Mensaje enviado (mock):", form);
      await new Promise((resolve) => setTimeout(resolve, 800));
      setStatus("sent");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }

  const isSending = status === "sending";

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

    <button
    type="submit"
    className="btn-primary btn-icon btn-auto"
    disabled={status === "sending"}
  >
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
