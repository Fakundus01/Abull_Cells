import { Link, useSearchParams } from "react-router-dom";
import { Clock, ShieldCheck, ArrowRight, Receipt, MessageCircle } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

const WHATSAPP_NUMBER = import.meta.env.VITE_CHECKOUT_WHATSAPP_NUMBER || "";

function CheckoutPending() {
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const orderId = params.get("orderId");

  const message = encodeURIComponent(
    `Hola! Quiero enviar el comprobante de transferencia${orderId ? ` para la orden #${orderId}` : ""}.`
  );
  const whatsappHref = WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`
    : null;

  return (
    <section className="home-section checkout-pending-page">
      <div className="checkout-success-card card-animate">
        <div className="checkout-success-top">
          <div className="checkout-success-badge">
            <ShieldCheck size={18} className="icon" />
            {t("checkoutStatus.pending.badge")}
          </div>

          <div className="checkout-success-icon">
            <Clock size={28} className="icon" />
          </div>

          <h1>{t("checkoutStatus.pending.title")}</h1>
          <p className="muted">{t("checkoutStatus.pending.subtitle")}</p>
          {orderId && <p className="muted">{t("checkoutStatus.pending.orderNumber", { orderId })}</p>}
        </div>

        <div className="checkout-success-steps">
          <div className="success-step">
            <span className="step-ico">
              <Receipt size={16} className="icon" />
            </span>
            <div>
              <div className="step-title">{t("checkoutStatus.pending.steps.payment.title")}</div>
              <div className="step-sub">{t("checkoutStatus.pending.steps.payment.subtitle")}</div>
            </div>
          </div>

          <div className="success-step">
            <span className="step-ico">
              <MessageCircle size={16} className="icon" />
            </span>
            <div>
              <div className="step-title">{t("checkoutStatus.pending.steps.whatsapp.title")}</div>
              <div className="step-sub">{t("checkoutStatus.pending.steps.whatsapp.subtitle")}</div>
            </div>
          </div>
        </div>

        <div className="checkout-failure-help">
          {t("checkoutStatus.pending.details").map((line) => (
            <div key={line} className="failure-tip">
              <span className="tip-dot" />
              {line}
            </div>
          ))}
        </div>

        <div className="checkout-success-actions">
          {whatsappHref && (
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="btn-primary btn-icon">
              <MessageCircle size={18} className="icon" />
              {t("checkoutStatus.pending.actions.whatsapp")}
            </a>
          )}

          <Link to="/mis-pedidos" className="btn-secondary btn-icon">
            <ArrowRight size={18} className="icon" />
            {t("checkoutStatus.pending.actions.orders")}
          </Link>

          <Link to="/" className="btn-secondary btn-icon">
            <ArrowRight size={18} className="icon" />
            {t("checkoutStatus.pending.actions.home")}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default CheckoutPending;