// src/pages/CheckoutSuccess.jsx
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, ShieldCheck, ArrowRight, ShoppingBag, Mail } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useEffect } from "react";
import { confirmMpPayment } from "../services/api";

function CheckoutSuccess() {
  const { t } = useLanguage();
  const [params] = useSearchParams();
  useEffect(() => {
    const paymentId = params.get("payment_id") || params.get("collection_id");
    const externalRef = params.get("external_reference");

    if (!paymentId && !externalRef) return;

    confirmMpPayment({
      paymentId,
      orderId: externalRef,
    }).catch((err) => {
      console.error("[MP] Error confirmando pago:", err);
    });
  }, [params]);
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
          <p className="muted">
            {t("checkoutStatus.success.subtitle")}
          </p>
        </div>

        <div className="checkout-success-steps">
          <div className="success-step">
            <span className="step-ico">
              <Mail size={16} className="icon" />
            </span>
            <div>
              <div className="step-title">{t("checkoutStatus.success.steps.email.title")}</div>
              <div className="step-sub">{t("checkoutStatus.success.steps.email.subtitle")}</div>
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
          <Link to="/" className="btn-primary btn-icon">
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
