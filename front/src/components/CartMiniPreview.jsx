import { Link } from "react-router-dom";
import { ShoppingCart, Trash2 } from "lucide-react";
import { useCart } from "../context/CartContext"; // ajustá ruta

export default function CartMiniPreview() {
  const { items, totalItems, totalPrice, removeFromCart } = useCart();

  return (
    <div className="cart-mini">
      <div className="cart-mini-head">
        <div className="cart-mini-title">
          <ShoppingCart size={16} className="icon" />
          <strong>Carrito</strong>
        </div>

        <span className="cart-mini-pill">
          {totalItems || 0} ítem{(totalItems || 0) === 1 ? "" : "s"}
        </span>
      </div>

      {(!items || items.length === 0) ? (
        <div className="cart-mini-empty">
          <p><strong>Carrito vacío</strong></p>
          <p>Agregá productos y aparecen acá.</p>
          <Link to="/tienda" className="cart-mini-btn">Ir a la tienda</Link>
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
                  aria-label={`Quitar ${it.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {items.length > 4 && (
            <div className="cart-mini-more">+{items.length - 4} más…</div>
          )}

          <div className="cart-mini-foot">
            <div className="cart-mini-total">
              <span>Total</span>
              <strong>${Number(totalPrice || 0).toLocaleString("es-AR")}</strong>
            </div>

            <Link to="/carrito" className="cart-mini-btn primary">
              Ver carrito
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
