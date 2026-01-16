import { Link } from "react-router-dom";
import { ShoppingCart, Trash2 } from "lucide-react";
import { useCart } from "../context/CartContext"; // ajustá ruta
import { useLanguage } from "../context/LanguageContext";

export default function CartMiniPreview() {
  const { items, totalItems, totalPrice, removeFromCart } = useCart();
  const { t } = useLanguage();
  const itemsCount = totalItems || 0;
  const itemLabel =
    itemsCount === 1
      ? t("cartMini.items_one", { count: itemsCount })
      : t("cartMini.items_other", { count: itemsCount });

  return (
    <div className="cart-mini">
      <div className="cart-mini-head">
        <div className="cart-mini-title">
          <ShoppingCart size={16} className="icon" />
          <strong>{t("cart.title")}</strong>
        </div>

        <span className="cart-mini-pill">
          {itemLabel}
        </span>
      </div>

      {(!items || items.length === 0) ? (
        <div className="cart-mini-empty">
          <p><strong>{t("cartMini.emptyTitle")}</strong></p>
          <p>{t("cartMini.emptySubtitle")}</p>
          <Link to="/tienda" className="cart-mini-btn">
            {t("cartMini.goToStore")}
          </Link>
        </div>
      ) : (
        <>
          <div className="cart-mini-list">
            {items.slice(0, 4).map((it) => (
              <div key={it.id} className="cart-mini-item">
                <div className="cart-mini-thumb">
                  {it.imageUrl ? <img src={it.imageUrl} alt={it.name} /> : <span>—</span>}
                </div>

                <div className="cart-mini-info">
                  <div className="cart-mini-name">{it.name}</div>
                  <div className="cart-mini-meta">
                    x{it.quantity} · ${Number(it.price).toLocaleString("es-AR")}
                  </div>
                </div>

                <button
                  type="button"
                  className="cart-mini-remove"
                  onClick={() => removeFromCart(it.id)}
                  aria-label={t("cartMini.removeItem", { name: it.name })}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

         <div className="cart-mini-more">
              {t("cartMini.moreItems", { count: items.length - 4 })}
            </div>

          <div className="cart-mini-foot">
            <div className="cart-mini-total">
              <span>{t("cart.total")}</span>
              <strong>${Number(totalPrice || 0).toLocaleString("es-AR")}</strong>
            </div>

            <Link to="/carrito" className="cart-mini-btn primary">
             {t("cartMini.viewCart")}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
