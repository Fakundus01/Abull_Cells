// src/pages/CheckoutFailure.jsx
import { Link, useSearchParams } from "react-router-dom";
import { XCircle, AlertTriangle, ArrowRight, ShoppingBag, MessageCircle } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useEffect } from "react";
const WHATSAPP_NUMBER = import.meta.env.VITE_CHECKOUT_WHATSAPP_NUMBER || "";

function CheckoutFailure() {
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const orderId = params.get("orderId") || params.get("external_reference");

  const message = encodeURIComponent(
    `Hola! Necesito ayuda con un pago${orderId ? ` de la orden #${orderId}` : ""}.`
  );
  const whatsappHref = WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`
    : null;

  return (
    <section className="home-section checkout-failure-page">
      <div className="checkout-failure-card card-animate">
        <div className="checkout-failure-top">
          <div className="checkout-failure-badge">
            <AlertTriangle size={18} className="icon" />
            {t("checkoutStatus.failure.badge")}
          </div>

          <div className="checkout-failure-icon">
            <XCircle size={28} className="icon" />
          </div>

          <h1>{t("checkoutStatus.failure.title")}</h1>
           <p className="muted">{t("checkoutStatus.failure.subtitle")}</p>
        </div>

        <div className="checkout-failure-help">
          <div className="failure-tip">
            <span className="tip-dot" />
            {t("checkoutStatus.failure.tips.alias")}
          </div>
          <div className="failure-tip">
            <span className="tip-dot" />
            {t("checkoutStatus.failure.tips.receipt")}
          </div>
          <div className="failure-tip">
            <span className="tip-dot" />
            {t("checkoutStatus.failure.tips.contact")}
          </div>
        </div>

        <div className="checkout-failure-actions">
          {whatsappHref && (
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="btn-primary btn-icon">
              <MessageCircle size={18} className="icon" />
              {t("checkoutStatus.failure.actions.whatsapp")}
            </a>
          )}

          <Link to="/carrito" className="btn-secondary btn-icon">
            <ArrowRight size={18} className="icon" />
            {t("checkoutStatus.failure.actions.cart")}
          </Link>

          <Link to="/tienda" className="btn-secondary btn-icon">
            <ShoppingBag size={18} className="icon" />
            {t("checkoutStatus.failure.actions.store")}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default CheckoutFailure;
