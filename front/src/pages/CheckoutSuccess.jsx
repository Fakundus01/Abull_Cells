// src/pages/CheckoutSuccess.jsx
import { Link } from "react-router-dom";
import { CheckCircle2, ShieldCheck, ArrowRight, ShoppingBag, Mail } from "lucide-react";

function CheckoutSuccess() {
  return (
    <section className="home-section checkout-success-page">
      <div className="checkout-success-card card-animate">
        <div className="checkout-success-top">
          <div className="checkout-success-badge">
            <ShieldCheck size={18} className="icon" />
            Pago acreditado
          </div>

          <div className="checkout-success-icon">
            <CheckCircle2 size={28} className="icon" />
          </div>

          <h1>Pago exitoso</h1>
          <p className="muted">
            ¡Gracias por tu compra! En breve recibirás un correo con los detalles.
          </p>
        </div>

        <div className="checkout-success-steps">
          <div className="success-step">
            <span className="step-ico">
              <Mail size={16} className="icon" />
            </span>
            <div>
              <div className="step-title">Confirmación por email</div>
              <div className="step-sub">Te llega el detalle del pedido y el estado del pago.</div>
            </div>
          </div>

          <div className="success-step">
            <span className="step-ico">
              <ShoppingBag size={16} className="icon" />
            </span>
            <div>
              <div className="step-title">Preparación del pedido</div>
              <div className="step-sub">Armamos tu compra y coordinamos el envío/retiro.</div>
            </div>
          </div>
        </div>

        <div className="checkout-success-actions">
          <Link to="/" className="btn-primary btn-icon">
            <ArrowRight size={18} className="icon" />
            Volver al inicio
          </Link>

          <Link to="/tienda" className="btn-secondary btn-icon">
            <ShoppingBag size={18} className="icon" />
            Seguir comprando
          </Link>
        </div>
      </div>
    </section>
  );
}

export default CheckoutSuccess;
