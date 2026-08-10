// src/pages/Cart.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useLanguage } from "../context/LanguageContext";
import { DEFAULT_PRODUCT_IMAGE, resolveImageUrl } from "../utils/imageUrl";
import {
  ShoppingCart,
  Trash2,
  X,
  ArrowLeft,
  CreditCard,
  PackageOpen,
  Plus,
  Minus,
  CheckCircle2,
} from "lucide-react";

function Cart() {
  const { t } = useLanguage();
  const { items, totalItems, totalPrice, addToCart, decrementFromCart, removeFromCart, clearCart } =
    useCart();

  const [toast, setToast] = useState(null); // { type: 'ok'|'info'|'error', msg }
  const [bumpId, setBumpId] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 1400);
    return () => clearTimeout(id);
  }, [toast]);

  const bump = (id) => {
    setBumpId(id);
    setTimeout(() => setBumpId(null), 250);
  };

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
              <span className="cart-pill-count">{totalItems}</span>
              <span className="cart-pill-label"> {labelAdded}</span>
            </span>
          </p>
        </div>

        <button className="btn-secondary btn-icon cart-clear-btn" onClick={clearCart}>
          <Trash2 size={18} className="icon" />
          <span className="cart-clear-text">{t("cart.clear")}</span>
        </button>
      </header>

      {toast && (
        <div className={`toast toast--${toast.type} toast-animate`} role="status">
          <CheckCircle2 size={18} className="icon" />
          <span>{toast.msg}</span>
        </div>
      )}

      <div className="cart-grid">
        <div className="cart-items">
          {items.map((item) => (
            <article key={item.id} className="cart-item card-animate">
              <img
                src={resolveImageUrl(item.imageUrl, DEFAULT_PRODUCT_IMAGE)}
                alt={item.name}
                className="cart-item-image"
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                }}
              />

              <div className="cart-item-info">
                <h3 className="cart-item-title">{item.name}</h3>

                {item.originalPrice ? (
                  <div className="price-block">
                    <p className="product-price old">
                      ${Number(item.originalPrice).toLocaleString("es-AR")}
                    </p>
                    <p className="product-price new">
                      ${Number(item.price).toLocaleString("es-AR")}
                    </p>
                    {item.offerLabel && <span className="offer-mini">{item.offerLabel}</span>}
                  </div>
                ) : (
                  <p className="product-price">
                    ${Number(item.price).toLocaleString("es-AR")}
                  </p>
                )}

                {(() => {
                  const maxStock = Number(item.stock ?? 0);
                  const hasCap = Number.isFinite(maxStock) && maxStock > 0;
                  const isMax = hasCap && Number(item.quantity) >= maxStock;

                  return (
                    <div className="cart-qty-controls">
                      <button
                        type="button"
                        className="cart-qty-btn"
                        onClick={() => {
                          const wasLast = item.quantity === 1;
                          decrementFromCart(item.id, 1);
                          bump(item.id);

                          setToast({
                            type: "info",
                            msg: wasLast
                              ? t("cart.toastRemoved")
                              : t("cart.toastRemovedOne"),
                          });
                        }}
                        aria-label={t("cart.decrease")}
                        title={t("cart.decrease")}
                      >
                        <Minus size={16} />
                      </button>

                      <span className={`cart-qty-badge ${bumpId === item.id ? "bump" : ""}`}>
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        className="cart-qty-btn"
                        disabled={isMax}
                        onClick={() => {
                          addToCart(item, 1);
                          bump(item.id);
                          setToast({ type: "ok", msg: t("cart.toastAddedOne") });
                        }}
                        aria-label={t("cart.increase")}
                        title={isMax ? t("cart.maxStock") : t("cart.increase")}
                      >
                        <Plus size={16} />
                      </button>

                      {hasCap && (
                        <span className="cart-qty-cap">
                          / {maxStock}
                        </span>
                      )}
                    </div>
                  );
                })()}               
              </div>

              <div className="cart-item-subtotal" title={t("cart.subtotal")}>
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

          <div className="cart-summary-hint">{t("cart.tip")}</div>
        </aside>
      </div>
    </section>
  );
}

export default Cart;
