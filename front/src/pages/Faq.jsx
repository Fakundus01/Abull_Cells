// src/pages/Faq.jsx
import { useMemo, useState } from "react";
import { HelpCircle, ChevronDown, ShieldCheck, Truck, CreditCard, BadgeCheck } from "lucide-react";

const FAQS = [
  {
    q: "¿Hacen envíos a todo el país?",
    a: "Sí, realizamos envíos a todo Argentina a través de distintos correos. El costo se calcula según tu domicilio.",
    icon: Truck,
  },
  {
    q: "¿Qué medios de pago aceptan?",
    a: "Trabajamos con Mercado Pago: tarjetas de crédito, débito, efectivo en puntos de pago y otros métodos disponibles en la plataforma.",
    icon: CreditCard,
  },
  {
    q: "¿Los productos tienen garantía?",
    a: "Sí, todos los productos nuevos cuentan con garantía oficial del fabricante. La duración depende de la marca y el modelo.",
    icon: BadgeCheck,
  },
  {
    q: "¿Puedo retirar en el local?",
    a: "Sí, podés seleccionar retiro en local y coordinar el horario. La dirección la tenés en la sección 'Contáctanos'.",
    icon: ShieldCheck,
  },
  {
    q: "¿Cómo sé si mi compra fue confirmada?",
    a: "Te vamos a enviar un correo de confirmación con los datos de tu pedido una vez que el pago se acredite.",
    icon: HelpCircle,
  },
];

function Faq() {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = useMemo(() => FAQS, []);

  function toggle(index) {
    setOpenIndex((prev) => (prev === index ? -1 : index));
  }

  return (
    <main className="home-section faq-page">
      <header className="page-header--v2 card-animate">
        <div className="page-title-wrap--v2">
          <div>
            <div className="page-badge--v2">
              <HelpCircle size={18} className="icon" />
              FAQ
            </div>

            <h1 className="page-title--v2">Preguntas frecuentes</h1>
            <p className="page-subtitle--v2">
              Respondemos las dudas más comunes sobre Abul Cell.
            </p>
          </div>
        </div>
      </header>

      <div className="faq-list">
        {faqs.map((item, index) => {
          const Icon = item.icon || HelpCircle;
          const isOpen = openIndex === index;

          return (
            <article
              key={index}
              className={`faq-item ${isOpen ? "open" : ""} card-animate`}
            >
              <button
                type="button"
                className="faq-trigger"
                onClick={() => toggle(index)}
                aria-expanded={isOpen}
              >
                <span className="faq-q">
                  <span className="faq-q-icon">
                    <Icon size={16} className="icon" />
                  </span>
                  {item.q}
                </span>

                <span className={`faq-chevron ${isOpen ? "rot" : ""}`}>
                  <ChevronDown size={18} className="icon" />
                </span>
              </button>

              <div className={`faq-panel ${isOpen ? "open" : ""}`}>
                <div className="faq-panel-inner">
                  <p>{item.a}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}

export default Faq;
