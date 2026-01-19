// src/pages/Checkout.jsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { createOrder, createMpPreference, fetchAddresses } from "../services/api";
import { useToast } from "../context/ToastContext";
import LoadingOverlay from "../components/LoadingOverlay";
import { useLanguage } from "../context/LanguageContext";
import {
  CreditCard,
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
  const { t } = useLanguage();

  const FIELD_LABELS = {
    name: t("checkout.fields.name"),
    email: t("checkout.fields.email"),
    phone: t("checkout.fields.phone"),
    notes: t("checkout.fields.notes"),
  };

  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  const { user } = useAuth();

  // ✅ Entrega (envío / retiro)
  const [deliveryMethod, setDeliveryMethod] = useState("pickup"); // "pickup" | "delivery"
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  const [manualAddress, setManualAddress] = useState({
    street: "",
    city: "",
    province: "",
    postalCode: "",
    type: "house", // house | apartment | office | other
    apartment: "",
    floor: "",
    bell: "",
    notes: "",
  });

  const [paymentMethod, setPaymentMethod] = useState("mercadopago"); // mercadopago | efectivo
  const [cashGiven, setCashGiven] = useState(""); // "con cuánto abonás"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successOrderId, setSuccessOrderId] = useState(null);
  const { showToast } = useToast();

  const requiredFields = useMemo(() => ["name", "email"], []);

  const missing = useMemo(
    () => requiredFields.filter((f) => !customer[f]?.trim()),
    [customer, requiredFields]
  );

  const missingLabels = useMemo(
    () => missing.map((k) => FIELD_LABELS[k] || k),
    [missing, FIELD_LABELS]
  );

  const isCartEmpty = items.length === 0;

  // Prefill si está logueado
  useEffect(() => {
    if (!user) return;
    setCustomer((prev) => ({
      ...prev,
      name: prev.name || user.name || "",
      email: prev.email || user.email || "",
    }));
  }, [user]);

  // Cargar direcciones si eligió envío
  useEffect(() => {
    async function load() {
      if (!user || deliveryMethod !== "delivery") return;

      try {
        setLoadingAddresses(true);
        const data = await fetchAddresses();
        setAddresses(Array.isArray(data) ? data : []);
        const def = (data || []).find((a) => a.isDefault);
        setSelectedAddressId(def?.id ?? (data?.[0]?.id ?? null));
      } catch {
        setAddresses([]);
        setSelectedAddressId(null);
      } finally {
        setLoadingAddresses(false);
      }
    }
    load();
  }, [user, deliveryMethod]);

  if (isCartEmpty && !successOrderId) {
    return (
      <section className="home-section checkout-empty card-animate">
        <div className="checkout-empty-icon">
          <ShoppingBag size={22} className="icon" />
        </div>
        <div>
          <h1>{t("checkout.title")}</h1>
          <p>{t("checkout.empty")}</p>
          <Link to="/tienda" className="btn-primary btn-icon">
            <ArrowRight size={18} className="icon" />
            {t("checkout.backToStore")}
          </Link>
        </div>
      </section>
    );
  }

  function handleManualAddrChange(e) {
    const { name, value } = e.target;
    setManualAddress((prev) => ({ ...prev, [name]: value }));
  }

  const selectedAddr = selectedAddressId
    ? addresses.find((a) => a.id === selectedAddressId)
    : null;

  const addressText =
    deliveryMethod !== "delivery"
      ? t("checkout.address.pickupLabel")
      : selectedAddr
        ? `${t("checkout.address.deliveryLabel")} - ${selectedAddr.label}: ${selectedAddr.street}, ${selectedAddr.city}, ${selectedAddr.province} ${selectedAddr.postalCode ? `(${t("checkout.address.postalCodePrefix")} ${selectedAddr.postalCode})` : ""}`
        : `${t("checkout.address.deliveryLabel")} - ${manualAddress.street}, ${manualAddress.city}, ${manualAddress.province} ${manualAddress.postalCode ? `(${t("checkout.address.postalCodePrefix")} ${manualAddress.postalCode})` : ""}`;

  const finalNotes = [customer.notes, addressText].filter(Boolean).join("\n");

  const orderPayload = {
    items: items.map((it) => ({ productId: it.id, quantity: it.quantity })),
    customer: { ...customer, notes: finalNotes },
    paymentMethod,
    cashGiven: paymentMethod === "efectivo" ? cashGiven || null : null,

    // ✅ nuevos (aunque el backend no los persista aún, no rompen)
    deliveryMethod,
    addressId: deliveryMethod === "delivery" ? (selectedAddressId || null) : null,
    manualAddress: deliveryMethod === "delivery" && !selectedAddressId ? manualAddress : null,
  };

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
       showToast({
        type: "error",
        title: t("checkout.errors.emptyCartTitle"),
        message: t("checkout.errors.emptyCartMessage"),
      });
      return;
    }

    if (missing.length > 0) {
      setError(t("checkout.errors.missingFields"));
      return;
    }

    // ✅ Validación de dirección SOLO al confirmar compra
    if (deliveryMethod === "delivery") {
      const hasSelected = user && selectedAddressId;
      const hasManual =
        manualAddress.street.trim() &&
        manualAddress.city.trim() &&
        manualAddress.province.trim();

      if (!hasSelected && !hasManual) {
        setError(t("checkout.errors.missingAddress"));
        return;
      }
    }

    if (paymentMethod === "efectivo") {
      const n = Number(String(cashGiven).replace(/[^\d]/g, ""));
      if (!n || n <= 0) {
        setError(t("checkout.errors.missingCashAmount"));
        return;
      }
      if (n < totalPrice) {
        setError(t("checkout.errors.cashTooLow"));
        return;
      }
    }

    try {
      setLoading(true);

      const selectedAddr = selectedAddressId
        ? addresses.find((a) => a.id === selectedAddressId)
        : null;

      const addressText =
          deliveryMethod !== "delivery"
            ? t("checkout.address.pickupLabel")
            : selectedAddr
              ? `${t("checkout.address.deliveryLabel")} - ${selectedAddr.label}: ${selectedAddr.street}, ${selectedAddr.city}, ${selectedAddr.province} ${selectedAddr.postalCode ? `(${t("checkout.address.postalCodePrefix")} ${selectedAddr.postalCode})` : ""}`
              : `${t("checkout.address.deliveryLabel")} - ${manualAddress.street}, ${manualAddress.city}, ${manualAddress.province} ${manualAddress.postalCode ? `(${t("checkout.address.postalCodePrefix")} ${manualAddress.postalCode})` : ""}`;

      const finalNotes = [customer.notes, addressText].filter(Boolean).join("\n");

      const orderPayload = {
        items: items.map((it) => ({ productId: it.id, quantity: it.quantity })),
        customer: { ...customer, notes: finalNotes },
        paymentMethod,
        cashGiven: paymentMethod === "efectivo" ? (cashGiven || null) : null,

        deliveryMethod,
        addressId: deliveryMethod === "delivery" ? (selectedAddressId || null) : null,
        manualAddress: deliveryMethod === "delivery" && !selectedAddressId ? manualAddress : null,
      };

      const order = await createOrder(orderPayload);

      if (paymentMethod === "mercadopago") {
        const pref = await createMpPreference({ orderId: order.id });

        console.log("[MP][front] initPoint recibido:", pref.initPoint);

        clearCart();

        window.open(pref.initPoint, "_blank", "noopener,noreferrer");

        navigate("/");
        return;
      }

      setSuccessOrderId(order.id);
      clearCart();
    } catch (err) {
      console.error("[CHECKOUT] Error en handleSubmit:", err);
      setError(err.message || t("checkout.errors.generic"));
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
          <h1>{t("checkout.success.title")}</h1>
          <p>
            {t("checkout.success.orderNumber", { orderId: successOrderId })}
          </p>
          <p>{t("checkout.success.emailNotice")}</p>

          <button className="btn-primary btn-icon" onClick={() => navigate("/")}>
            <ArrowRight size={18} className="icon" />
            {t("checkout.success.backHome")}
          </button>
        </div>
      </section>
    );
  }

  return (
  <section className="checkout-page">
    <LoadingOverlay show={loading} />

    <header className="checkout-head card-animate">
      <div className="checkout-head-left">
        <div className="checkout-badge">
          <ShieldCheck size={18} className="icon" />
          {t("checkout.secureBadge")}
        </div>
        <h1 className="checkout-title">{t("checkout.title")}</h1>
        <p className="checkout-subtitle">
          {t("checkout.subtitle")}
        </p>
      </div>
    </header>

    <div className="checkout-grid">
      {/* Datos del cliente + medios de pago */}
      <form className="form-card checkout-form card-animate" onSubmit={handleSubmit}>
        <h2 className="checkout-h2">{t("checkout.billingTitle")}</h2>

        <div className="field-grid">
          <label className="field">
            <span className="field-label">
              <User size={16} className="icon" />
               {t("checkout.fields.nameRequired")}
            </span>
            <input name="name" value={customer.name} onChange={handleChange} required />
          </label>

          <label className="field">
            <span className="field-label">
              <Mail size={16} className="icon" />
              {t("checkout.fields.emailRequired")}
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
               {t("checkout.fields.phone")}
            </span>
            <input name="phone" value={customer.phone} onChange={handleChange} />
          </label>
        </div>

        <div className="checkout-section card-animate">
          <h2 className="checkout-h2">{t("checkout.deliveryTitle")}</h2>

          <div className="delivery-options">
            <label className={`delivery-option ${deliveryMethod === "pickup" ? "active" : ""}`}>
              <input
                type="radio"
                name="deliveryMethod"
                value="pickup"
                checked={deliveryMethod === "pickup"}
                onChange={() => setDeliveryMethod("pickup")}
              />
              {t("checkout.delivery.pickup")}
            </label>

            <label className={`delivery-option ${deliveryMethod === "delivery" ? "active" : ""}`}>
              <input
                type="radio"
                name="deliveryMethod"
                value="delivery"
                checked={deliveryMethod === "delivery"}
                onChange={() => setDeliveryMethod("delivery")}
              />
              {t("checkout.delivery.delivery")}
            </label>
          </div>

          {deliveryMethod === "delivery" && (
            <div className="delivery-box">
              <p className="delivery-hint">{t("checkout.delivery.areaNote")}</p>

              {user && (
                <>
                  <p className="checkout-muted">
                    {t("checkout.delivery.savedAddressHint")}
                  </p>

                  {loadingAddresses ? (
                    <p className="checkout-muted">{t("checkout.delivery.loading")}</p>
                  ) : addresses.length > 0 ? (
                    <div className="delivery-saved">
                      <label className="auth-label">
                        {t("checkout.delivery.savedAddressLabel")}
                        <select
                          className="address-select"
                          value={selectedAddressId ?? ""}
                          onChange={(e) => setSelectedAddressId(Number(e.target.value))}
                        >
                          {addresses.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.label} — {a.street}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : (
                    <div className="delivery-empty">
                      <p className="checkout-muted">
                        {t("checkout.delivery.noSavedAddresses")}
                      </p>
                      <p className="checkout-muted">
                        {t("checkout.delivery.manualHint")}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Manual */}
              {(!user || addresses.length === 0 || !selectedAddressId) && (
                <div className="delivery-manual">
                  <div className="delivery-row">
                    <label className="auth-label">
                      {t("checkout.delivery.typeLabel")}
                      <select
                        name="type"
                        className="address-select"
                        value={manualAddress.type}
                        onChange={handleManualAddrChange}
                      >
                        <option value="house">{t("checkout.delivery.types.house")}</option>
                        <option value="apartment">{t("checkout.delivery.types.apartment")}</option>
                        <option value="office">{t("checkout.delivery.types.office")}</option>
                        <option value="other">{t("checkout.delivery.types.other")}</option>
                      </select>
                    </label>

                    <label className="auth-label">
                      {t("checkout.delivery.streetLabel")}
                      <input
                        name="street"
                        value={manualAddress.street}
                        onChange={handleManualAddrChange}
                        placeholder={t("checkout.delivery.streetPlaceholder")}
                      />
                    </label>
                  </div>

                  <div className="delivery-row">
                    <label className="auth-label">
                      {t("checkout.delivery.cityLabel")}
                      <input
                        name="city"
                        value={manualAddress.city}
                        onChange={handleManualAddrChange}
                        placeholder={t("checkout.delivery.cityPlaceholder")}
                      />
                    </label>

                    <label className="auth-label">
                      {t("checkout.delivery.provinceLabel")}
                      <input
                        name="province"
                        value={manualAddress.province}
                        onChange={handleManualAddrChange}
                        placeholder={t("checkout.delivery.provincePlaceholder")}
                      />
                    </label>
                  </div>

                  <div className="delivery-row">
                    <label className="auth-label">
                      {t("checkout.delivery.postalCodeLabel")}
                      <input
                        name="postalCode"
                        value={manualAddress.postalCode}
                        onChange={handleManualAddrChange}
                        placeholder={t("checkout.delivery.postalCodePlaceholder")}
                      />
                    </label>

                    <label className="auth-label">
                      {t("checkout.delivery.apartmentLabel")}
                      <input
                        name="apartment"
                        value={manualAddress.apartment}
                        onChange={handleManualAddrChange}
                        placeholder={t("checkout.delivery.apartmentPlaceholder")}
                      />
                    </label>
                  </div>

                  <div className="delivery-row">
                    <label className="auth-label">
                      {t("checkout.delivery.floorLabel")}
                      <input
                        name="floor"
                        value={manualAddress.floor}
                        onChange={handleManualAddrChange}
                        placeholder={t("checkout.delivery.floorPlaceholder")}
                      />
                    </label>

                    <label className="auth-label">
                      {t("checkout.delivery.bellLabel")}
                      <input
                        name="bell"
                        value={manualAddress.bell}
                        onChange={handleManualAddrChange}
                        placeholder={t("checkout.delivery.bellPlaceholder")}
                      />
                    </label>
                  </div>

                  <label className="auth-label">
                    {t("checkout.delivery.notesLabel")}
                    <input
                      name="notes"
                      value={manualAddress.notes}
                      onChange={handleManualAddrChange}
                      placeholder={t("checkout.delivery.notesPlaceholder")}
                    />
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Medios de pago */}
        <div className="checkout-section card-animate">
          <h2 className="checkout-h2">{t("checkout.paymentTitle")}</h2>

          <div className="payment-options">
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
                <span className="payment-title">{t("checkout.payment.mercadoPago.title")}</span>
                <span className="payment-subtitle">
                  {t("checkout.payment.mercadoPago.subtitle")}
                </span>
              </div>
              <span className="payment-tag">{t("checkout.payment.recommended")}</span>
            </label>

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
                <span className="payment-title">{t("checkout.payment.cash.title")}</span>
                <span className="payment-subtitle">
                  {t("checkout.payment.cash.subtitle")}
                </span>
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

        <label className="field">
          <span className="field-label">
            <StickyNote size={16} className="icon" />
            {t("checkout.fields.notesOptional")}
          </span>
          <textarea name="notes" value={customer.notes} onChange={handleChange} rows={3} />
        </label>

        {error && (
          <div className="alert-error" role="alert">
            <AlertTriangle size={16} className="icon" />
            <span>{error}</span>
          </div>
        )}

        {missing.length > 0 && (
          <p className="checkout-required-hint">
            {t("checkout.missingFieldsLabel")} <strong>{missingLabels.join(", ")}</strong>
          </p>
        )}

        <button className="btn-primary btn-icon" type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 size={18} className="icon spin" />
              {t("checkout.processing")}
            </>
          ) : (
            <>
              <CheckCircle2 size={18} className="icon" />
              {t("checkout.submit")}
            </>
          )}
        </button>
      </form>

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
    </div>
  </section>
);
}
export default Checkout;
