import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

function CheckoutSummary({ t, items, totalPrice }) {
  return (
    <aside className="checkout-summary card-animate">
      <h2 className="checkout-h2">{t("checkout.summaryTitle")}</h2>

      <ul className="checkout-items">
        {items.map((item) => (
          <li key={item.id} className="checkout-item">
            <div>
              <strong>{item.name}</strong>
              <div className="checkout-item-meta">
                {t("checkout.quantityLabel", { count: item.quantity })}
              </div>
            </div>
            <span>${(item.price * item.quantity).toLocaleString("es-AR")}</span>
          </li>
        ))}
      </ul>

      <div className="checkout-total">
        <span>{t("cart.total")}</span>
        <strong>${totalPrice.toLocaleString("es-AR")}</strong>
      </div>

      <Link to="/carrito" className="btn-secondary btn-icon checkout-back">
        <ArrowRight size={18} className="icon" />
        {t("checkout.backToCart")}
      </Link>
    </aside>
  );
}

export default CheckoutSummary;