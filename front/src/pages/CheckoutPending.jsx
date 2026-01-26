import { Link, useSearchParams } from "react-router-dom";
import { Clock, ShieldCheck, ArrowRight, Receipt, Mail } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

function CheckoutPending() {
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const orderId = params.get("orderId");

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
          {orderId && (
            <p className="muted">
              {t("checkoutStatus.pending.orderNumber", { orderId })}
            </p>
          )}
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
              <Mail size={16} className="icon" />
            </span>
            <div>
              <div className="step-title">{t("checkoutStatus.pending.steps.email.title")}</div>
              <div className="step-sub">{t("checkoutStatus.pending.steps.email.subtitle")}</div>
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
          <Link to="/mis-pedidos" className="btn-primary btn-icon">
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