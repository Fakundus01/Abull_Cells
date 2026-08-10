// src/pages/Contact.jsx
import { useState } from "react";
import { Mail, User, MessageSquare, Send, MapPin, Clock, Phone } from "lucide-react";
import { sendContactMessage } from "../services/api";

// ✅ NUEVO
import { useToast } from "../context/ToastContext";
import LoadingOverlay from "../components/LoadingOverlay";
import { useLanguage } from "../context/LanguageContext";

function Contact() {
  // ✅ NUEVO
  const { showToast } = useToast();
  const { t } = useLanguage();

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
        title: t("contact.toastSuccessTitle"),
        message: t("contact.toastSuccessMessage"),
      });

      // opcional: volver a idle después de un rato
      window.setTimeout(() => setStatus("idle"), 800);
    } catch (err) {
      console.error(err);
      setStatus("error");

      // ✅ NUEVO: toast error (si tu api tira err.message, lo usamos)
      showToast({
        type: "error",
        title: t("contact.toastErrorTitle"),
        message: err?.message || t("contact.toastErrorMessage"),
      });

      window.setTimeout(() => setStatus("idle"), 800);
    }
  }

  return (
    <main className="home-section contact-page">
      {/* ✅ NUEVO: overlay de carga sin mover layout */}
      <LoadingOverlay open={status === "sending"} label={t("contact.sending")} />

      <header className="page-header--v2 card-animate">
        <div className="page-title-wrap--v2">
          <div>
            <div className="page-badge--v2">
              <MessageSquare size={18} className="icon" />
              {t("contact.badge")}
            </div>

            <h1 className="page-title--v2">{t("contact.title")}</h1>
            <p className="page-subtitle--v2">
               {t("contact.subtitle")}
            </p>
          </div>
        </div>
      </header>

      <div className="grid-2">
        <form className="card-v2 card-pad form-grid card-animate" onSubmit={handleSubmit}>
          <div className="badge">
            <Mail size={16} className="icon" />
           {t("contact.badge")}
          </div>

          <div className="field">
            <label><User size={16} className="icon muted" /> {t("contact.form.nameLabel")}</label>
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
            <label><Mail size={16} className="icon muted" /> {t("contact.form.emailLabel")}</label>
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
            <label><MessageSquare size={16} className="icon muted" /> {t("contact.form.subjectLabel")}</label>
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
            <label><MessageSquare size={16} className="icon muted" /> {t("contact.form.messageLabel")}</label>
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
            <label>{t("contact.form.attachmentsLabel")}</label>
            <input
              className="input-v2"
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFilesChange}
            />
            <small className="muted">{t("contact.form.attachmentsHint")}</small>
          </div>

          <button
            type="submit"
            className="btn-primary btn-icon btn-auto"
            disabled={status === "sending"}
          >
            <Send size={18} className="icon" />
            {status === "sending" ? t("contact.form.sending") : t("contact.form.submit")}
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
            {t("contact.storeDetailsTitle")}
          </div>

          <p style={{ marginTop: ".75rem" }}>
            <strong>{t("contact.storeAddressLabel")}</strong> {t("contact.storeAddressValue")}
          </p>
          <p>
            <strong>{t("contact.storeHoursLabel")}</strong>{" "}
            <Clock size={16} className="icon muted" /> {t("contact.storeHoursValue")}
          </p>
          <p><strong>{t("contact.storeEmailLabel")}</strong> Abulcell185@gmail.com</p>
          <p>
            <strong>{t("contact.storePhoneLabel")}</strong>{" "}
            <Phone size={16} className="icon muted" /> {t("contact.storePhoneValue")}
          </p>
        </aside>
      </div>
    </main>
  );
}

export default Contact;
