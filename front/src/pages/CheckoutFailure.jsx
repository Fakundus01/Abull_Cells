// src/pages/CheckoutFailure.jsx
import { Link } from "react-router-dom";
import { XCircle, AlertTriangle, ArrowRight, ShoppingBag, RefreshCw } from "lucide-react";

function CheckoutFailure() {
  return (
    <section className="home-section checkout-failure-page">
      <div className="checkout-failure-card card-animate">
        <div className="checkout-failure-top">
          <div className="checkout-failure-badge">
            <AlertTriangle size={18} className="icon" />
            Pago no completado
          </div>

          <div className="checkout-failure-icon">
            <XCircle size={28} className="icon" />
          </div>

          <h1>Pago no completado</h1>
          <p className="muted">
            Tu pago no se pudo completar. No te preocupes: no se confirma la compra
            hasta que el pago se acredite.
          </p>
        </div>

        <div className="checkout-failure-help">
          <div className="failure-tip">
            <span className="tip-dot" />
            Revisá que tengas saldo / límite disponible.
          </div>
          <div className="failure-tip">
            <span className="tip-dot" />
            Probá con otra tarjeta o método dentro de Mercado Pago.
          </div>
          <div className="failure-tip">
            <span className="tip-dot" />
            Si se trabó el flujo, volvé al carrito y reintentá.
          </div>
        </div>

        <div className="checkout-failure-actions">
          <Link to="/checkout" className="btn-primary btn-icon">
            <RefreshCw size={18} className="icon" />
            Reintentar pago
          </Link>

          <Link to="/carrito" className="btn-secondary btn-icon">
            <ArrowRight size={18} className="icon" />
            Volver al carrito
          </Link>

          <Link to="/tienda" className="btn-secondary btn-icon">
            <ShoppingBag size={18} className="icon" />
            Ir a la tienda
          </Link>
        </div>
      </div>
    </section>
  );
}

export default CheckoutFailure;
