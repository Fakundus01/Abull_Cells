// FASE 3: modularización de Checkout (medios de pago).
import { CreditCard } from "lucide-react";

function CheckoutPaymentSection({
  t,
  paymentMethod,
  setPaymentMethod,
  cashGiven,
  setCashGiven,
}) {
  return (
    <>
      <div className="checkout-section card-animate">
        <h2 className="checkout-h2">{t("checkout.paymentTitle")}</h2>

        <div className="payment-options">
          <label
            className={[
              "payment-option",
              "payment-option--mp",
              paymentMethod === "mercadopago" ? "active" : "",
            ].join(" ")}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="mercadopago"
              checked={paymentMethod === "mercadopago"}
              onChange={() => setPaymentMethod("mercadopago")}
            />
            <span className="payment-icon">
              <CreditCard size={20} className="icon" />
            </span>
            <div className="payment-info">
              <span className="payment-title">{t("checkout.payment.mercadoPago.title")}</span>
              <span className="payment-subtitle">{t("checkout.payment.mercadoPago.subtitle")}</span>
            </div>
            <span className="payment-tag">{t("checkout.payment.recommended")}</span>
          </label>

          <label
            className={[
              "payment-option",
              "payment-option--cash",
              paymentMethod === "efectivo" ? "active" : "",
            ].join(" ")}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="efectivo"
              checked={paymentMethod === "efectivo"}
              onChange={() => setPaymentMethod("efectivo")}
            />
            <span className="payment-icon">💵</span>
            <div className="payment-info">
              <span className="payment-title">{t("checkout.payment.cash.title")}</span>
              <span className="payment-subtitle">{t("checkout.payment.cash.subtitle")}</span>
            </div>
          </label>
        </div>
      </div>

      {paymentMethod === "efectivo" && (
        <label className="field">
          <span className="field-label">{t("checkout.payment.cash.amountLabel")}</span>
          <input
            inputMode="numeric"
            placeholder={t("checkout.payment.cash.amountPlaceholder")}
            value={cashGiven}
            onChange={(e) => setCashGiven(e.target.value)}
          />
          <small className="field-hint">{t("checkout.payment.cash.amountHint")}</small>
        </label>
      )}
    </>
  );
}

export default CheckoutPaymentSection;