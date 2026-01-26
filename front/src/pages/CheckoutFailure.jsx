// src/pages/CheckoutFailure.jsx
import { Link, useSearchParams } from "react-router-dom";
import { XCircle, AlertTriangle, ArrowRight, ShoppingBag, RefreshCw } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useEffect } from "react";
import { confirmMpPayment } from "../services/api";

function CheckoutFailure() {
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
      console.error("[MP] Error confirmando pago fallido:", err);
    });
  }, [params]);
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
          <p className="muted">
            {t("checkoutStatus.failure.subtitle")}
          </p>
        </div>

        <div className="checkout-failure-help">
          <div className="failure-tip">
            <span className="tip-dot" />
            {t("checkoutStatus.failure.tips.balance")}
          </div>
          <div className="failure-tip">
            <span className="tip-dot" />
            {t("checkoutStatus.failure.tips.method")}
          </div>
          <div className="failure-tip">
            <span className="tip-dot" />
            {t("checkoutStatus.failure.tips.retry")}
          </div>
        </div>

        <div className="checkout-failure-actions">
          <Link to="/checkout" className="btn-primary btn-icon">
            <RefreshCw size={18} className="icon" />
            {t("checkoutStatus.failure.actions.retry")}
          </Link>

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
