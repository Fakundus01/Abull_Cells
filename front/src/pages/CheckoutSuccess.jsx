// src/pages/CheckoutSuccess.jsx
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, ShieldCheck, ArrowRight, ShoppingBag, MessageCircle } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { buildCheckoutWhatsappHref } from "../utils/whatsapp";

function CheckoutSuccess() {
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const orderId = params.get("orderId");

  const message = `Hola! Realicé un pedido${orderId ? ` #${orderId}` : ""}. ¿Me pasan el alias para transferir? También les envío el comprobante por acá cuando lo tenga.`;
  const whatsappHref = buildCheckoutWhatsappHref(message);

  return (
    <section className="home-section checkout-success-page">
      <div className="checkout-success-card card-animate">
        <div className="checkout-success-top">
          <div className="checkout-success-badge">
            <ShieldCheck size={18} className="icon" />
            {t("checkoutStatus.success.badge")}
          </div>

          <div className="checkout-success-icon">
            <CheckCircle2 size={28} className="icon" />
          </div>

          <h1>{t("checkoutStatus.success.title")}</h1>
          <p className="muted">{t("checkoutStatus.success.subtitle")}</p>
        </div>

        <div className="checkout-success-steps">
          <div className="success-step">
            <span className="step-ico">
              <MessageCircle size={16} className="icon" />
            </span>
            <div>
              <div className="step-title">{t("checkoutStatus.success.steps.whatsapp.title")}</div>
              <div className="step-sub">{t("checkoutStatus.success.steps.whatsapp.subtitle")}</div>
            </div>
          </div>

          <div className="success-step">
            <span className="step-ico">
              <ShoppingBag size={16} className="icon" />
            </span>
            <div>
              <div className="step-title">{t("checkoutStatus.success.steps.prep.title")}</div>
              <div className="step-sub">{t("checkoutStatus.success.steps.prep.subtitle")}</div>
            </div>
          </div>
        </div>

        <div className="checkout-success-actions">
          {whatsappHref && (
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="btn-primary btn-icon">
              <MessageCircle size={18} className="icon" />
              {t("checkoutStatus.success.actions.whatsapp")}
            </a>
          )}

          <Link to="/" className="btn-secondary btn-icon">
            <ArrowRight size={18} className="icon" />
            {t("checkoutStatus.success.actions.home")}
          </Link>

          <Link to="/tienda" className="btn-secondary btn-icon">
            <ShoppingBag size={18} className="icon" />
            {t("checkoutStatus.success.actions.store")}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default CheckoutSuccess;
