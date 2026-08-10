// src/pages/Faq.jsx
import { useMemo, useState } from "react";
import { HelpCircle, ChevronDown, ShieldCheck, Truck, CreditCard, BadgeCheck } from "lucide-react";

import { useLanguage } from "../context/LanguageContext";

function Faq() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = useMemo(() => {
    const items = t("faq.items");
    const icons = [Truck, CreditCard, BadgeCheck, ShieldCheck, HelpCircle];
    return (Array.isArray(items) ? items : []).map((item, index) => ({
      ...item,
      icon: icons[index] || HelpCircle,
    }));
  }, [t]);

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
              {t("faq.badge")}
            </div>

            <h1 className="page-title--v2">{t("faq.title")}</h1>
            <p className="page-subtitle--v2">
              {t("faq.subtitle")}
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
