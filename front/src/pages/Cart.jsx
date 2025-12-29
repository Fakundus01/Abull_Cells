// src/pages/Cart.jsx
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useLanguage } from "../context/LanguageContext";
import {
  ShoppingCart,
  Trash2,
  X,
  ArrowLeft,
  CreditCard,
  PackageOpen,
} from "lucide-react";

function Cart() {
  const { t } = useLanguage();
  const { items, totalItems, totalPrice, removeFromCart, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <section className="home-section">
        <div className="cart-empty card-animate">
          <div className="cart-empty-icon" aria-hidden="true">
            <PackageOpen size={34} />
          </div>

          <h1 className="cart-title">
            <ShoppingCart size={22} className="icon" />
            {t("cart.title")}
          </h1>

          <p className="cart-empty-text">{t("cart.empty")}</p>

          <Link to="/tienda" className="btn-primary btn-icon">
            <ArrowLeft size={18} className="icon" />
            {t("cart.goToStore")}
          </Link>
        </div>
      </section>
    );
  }

  const labelAdded =
    totalItems === 1 ? t("cart.productAdded_one") : t("cart.productAdded_other");

  return (
    <section className="home-section">
      <header className="cart-header">
        <div className="cart-header-left">
          <h1 className="cart-title">
            <ShoppingCart size={22} className="icon" />
            {t("cart.title")}
          </h1>

          <p className="cart-subtitle">
            <span className="cart-pill">
              {totalItems} {labelAdded}
            </span>
          </p>
        </div>

        <button className="btn-secondary btn-icon" onClick={clearCart}>
          <Trash2 size={18} className="icon" />
          {t("cart.clear")}
        </button>
      </header>

      <div className="cart-grid">
        <div className="cart-items">
          {items.map((item) => (
            <article key={item.id} className="cart-item card-animate">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="cart-item-image"
                loading="lazy"
              />

              <div className="cart-item-info">
                <h3 className="cart-item-title">{item.name}</h3>

                <p className="product-price">
                  ${item.price.toLocaleString("es-AR")}
                </p>

                <p className="cart-item-qty">
                  <span className="cart-qty-badge">x{item.quantity}</span>
                  <span>Cantidad</span>
                </p>

                <button
                  className="btn-small btn-danger btn-icon"
                  onClick={() => removeFromCart(item.id)}
                >
                  <X size={16} className="icon" />
                  {t("cart.remove")}
                </button>
              </div>

              <div className="cart-item-subtotal" title="Subtotal">
                ${(item.price * item.quantity).toLocaleString("es-AR")}
              </div>
            </article>
          ))}
        </div>

        <aside className="cart-summary card-animate">
          <h2 className="cart-summary-title">{t("cart.summary")}</h2>

          <div className="cart-summary-row">
            <span>{t("cart.totalProducts")}</span>
            <strong>{totalItems}</strong>
          </div>

          <div className="cart-summary-row total">
            <span>{t("cart.total")}</span>
            <strong>${totalPrice.toLocaleString("es-AR")}</strong>
          </div>

          <Link to="/checkout" className="btn-primary btn-icon btn-full">
            <CreditCard size={18} className="icon" />
            {t("cart.goToCheckout")}
          </Link>

          <div className="cart-summary-hint">
            Tip: revisá tu pedido antes de pagar ✨
          </div>
        </aside>
      </div>
    </section>
  );
}

export default Cart;
