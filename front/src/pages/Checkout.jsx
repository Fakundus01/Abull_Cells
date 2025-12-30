// src/pages/Checkout.jsx
import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { createOrder, createMpPreference } from "../services/api";
import {
  CreditCard,
  MapPin,
  Mail,
  Phone,
  User,
  StickyNote,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShoppingBag,
  ShieldCheck,
} from "lucide-react";


function Checkout() {

  const FIELD_LABELS_ES = {
  name: "Nombre y apellido",
  email: "Correo electrónico",
  phone: "Teléfono",
  notes: "Notas",
};

  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState({
  name: "",
  email: "",
  phone: "",
  notes: "",
});

  const [paymentMethod, setPaymentMethod] = useState("mercadopago"); // mercadopago | efectivo
  const [cashGiven, setCashGiven] = useState(""); // "con cuánto abonás"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successOrderId, setSuccessOrderId] = useState(null);

  const requiredFields = useMemo(() => ["name", "email"], []);

  const missing = useMemo(
    () => requiredFields.filter((f) => !customer[f]?.trim()),
    [customer, requiredFields]
  );

  const missingLabels = useMemo(
    () => missing.map((k) => FIELD_LABELS_ES[k] || k),
    [missing]
  );

  const isCartEmpty = items.length === 0;

  if (isCartEmpty && !successOrderId) {
    return (
      <section className="home-section checkout-empty card-animate">
        <div className="checkout-empty-icon">
          <ShoppingBag size={22} className="icon" />
        </div>
        <div>
          <h1>Checkout</h1>
          <p>Tu carrito está vacío.</p>
          <Link to="/tienda" className="btn-primary btn-icon">
            <ArrowRight size={18} className="icon" />
            Volver a la tienda
          </Link>
        </div>
      </section>
    );
  }

  function mapPaymentMethod(method) {
    if (method === "mercadopago") return "mercadopago";
    if (method === "efectivo") return "efectivo"; // o "cash" si tu backend lo espera así
    return method;
  } 

  function handleChange(e) {
    const { name, value } = e.target;
    setCustomer((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (items.length === 0) {
      setError("Tu carrito está vacío.");
      return;
    }

    if (missing.length > 0) {
      setError("Por favor completá todos los campos obligatorios.");
      return;
    }

    if (paymentMethod === "efectivo") {
        const n = Number(String(cashGiven).replace(/[^\d]/g, ""));
        if (!n || n <= 0) {
          setError("Indicá con cuánto vas a abonar (solo números).");
          return;
        }
        if (n < totalPrice) {
          setError("El monto con el que abonás no puede ser menor al total.");
          return;
        }
      }

    try {
      setLoading(true);

      const orderPayload = {
          customer,
          items: items.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
          paymentMethod: "mercadopago",
        };

      const order = await createOrder(orderPayload);

      if (paymentMethod === "mercadopago") {
        const pref = await createMpPreference({ orderId: order.id });

        console.log("[MP][front] initPoint recibido:", pref.initPoint);

        clearCart();
        window.location.href = pref.initPoint;
        return;
      }

      setSuccessOrderId(order.id);
      clearCart();
    } catch (err) {
      console.error("[CHECKOUT] Error en handleSubmit:", err);
      setError(err.message || "Ocurrió un error al procesar la compra.");
    } finally {
      setLoading(false);
    }
  }

  if (successOrderId) {
    return (
      <section className="home-section checkout-success card-animate">
        <div className="checkout-success-icon">
          <CheckCircle2 size={26} className="icon" />
        </div>
        <div>
          <h1>¡Gracias por tu compra!</h1>
          <p>
            Registramos tu orden con el número <strong>#{successOrderId}</strong>.
          </p>
          <p>En breve te va a llegar un correo con el detalle de la compra.</p>

          <button className="btn-primary btn-icon" onClick={() => navigate("/")}>
            <ArrowRight size={18} className="icon" />
            Volver al inicio
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="checkout-page">
      <header className="checkout-head card-animate">
        <div className="checkout-head-left">
          <div className="checkout-badge">
            <ShieldCheck size={18} className="icon" />
            Compra segura
          </div>
          <h1 className="checkout-title">Checkout</h1>
          <p className="checkout-subtitle">
            Completá tus datos y elegí el método de pago.
          </p>
        </div>
      </header>

      <div className="checkout-grid">
        {/* Datos del cliente + medios de pago */}
        <form className="form-card checkout-form card-animate" onSubmit={handleSubmit}>
          <h2 className="checkout-h2">Datos de facturación y envío</h2>

          <div className="field-grid">
            <label className="field">
              <span className="field-label">
                <User size={16} className="icon" />
                Nombre y apellido *
              </span>
              <input name="name" value={customer.name} onChange={handleChange} required />
            </label>

            <label className="field">
              <span className="field-label">
                <Mail size={16} className="icon" />
                Email *
              </span>
              <input
                type="email"
                name="email"
                value={customer.email}
                onChange={handleChange}
                required
              />
            </label>

            <label className="field">
              <span className="field-label">
                <Phone size={16} className="icon" />
                Teléfono
              </span>
              <input name="phone" value={customer.phone} onChange={handleChange} />
            </label>
          </div>

          {/* Medios de pago */}
          <div className="checkout-section card-animate">
            <h2 className="checkout-h2">Medios de pago</h2>

            <div className="payment-options">
              {/* Mercado Pago */}
              <label className={`payment-option ${paymentMethod === "mercadopago" ? "active" : ""}`}>
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
                  <span className="payment-title">Mercado Pago</span>
                  <span className="payment-subtitle">
                    Te redirigimos a Mercado Pago para completar el pago.
                  </span>
                </div>
                <span className="payment-tag">Recomendado</span>
              </label>

              {/* Efectivo (retiro en local) */}
              <label className={`payment-option ${paymentMethod === "efectivo" ? "active" : ""}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="efectivo"
                  checked={paymentMethod === "efectivo"}
                  onChange={() => setPaymentMethod("efectivo")}
                />
                <span className="payment-icon">💵</span>
                <div className="payment-info">
                  <span className="payment-title">Efectivo al retirar</span>
                  <span className="payment-subtitle">
                    Pagás en el local cuando venís a buscar tu pedido.
                  </span>
                </div>
              </label>
            </div>
          </div>
          {paymentMethod === "efectivo" && (
            <label className="field">
              <span className="field-label">¿Con cuánto abonás?</span>
              <input
                inputMode="numeric"
                placeholder="Ej: 20000"
                value={cashGiven}
                onChange={(e) => setCashGiven(e.target.value)}
              />
              <small className="field-hint">
                Te lo pedimos para preparar el cambio (si hace falta).
              </small>
            </label>
          )}

          <label className="field">
            <span className="field-label">
              <StickyNote size={16} className="icon" />
              Notas (opcional)
            </span>
            <textarea
              name="notes"
              value={customer.notes}
              onChange={handleChange}
              rows={3}
            />
          </label>

          {error && (
            <div className="alert-error" role="alert">
              <AlertTriangle size={16} className="icon" />
              <span>{error}</span>
            </div>
          )}

          {missing.length > 0 && (
          <p className="checkout-required-hint">
            Campos obligatorios faltantes: <strong>{missingLabels.join(", ")}</strong>
          </p>
          )}

          <button className="btn-primary btn-icon" type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="icon spin" />
                Procesando...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} className="icon" />
                Confirmar compra
              </>
            )}
          </button>
        </form>

        {/* Resumen del carrito */}
        <aside className="checkout-summary card-animate">
          <h2 className="checkout-h2">Resumen de compra</h2>

          <ul className="checkout-items">
            {items.map((item) => (
              <li key={item.id} className="checkout-item">
                <div>
                  <strong>{item.name}</strong>
                  <div className="checkout-item-meta">Cantidad: {item.quantity}</div>
                </div>
                <span>${(item.price * item.quantity).toLocaleString("es-AR")}</span>
              </li>
            ))}
          </ul>

          <div className="checkout-total">
            <span>Total</span>
            <strong>${totalPrice.toLocaleString("es-AR")}</strong>
          </div>

          <Link to="/carrito" className="btn-secondary btn-icon checkout-back">
            <ArrowRight size={18} className="icon" />
            Volver al carrito
          </Link>
        </aside>
      </div>
    </section>
  );
}

export default Checkout;
