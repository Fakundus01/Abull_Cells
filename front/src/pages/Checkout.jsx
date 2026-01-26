// src/pages/Checkout.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { ApiError, createOrder, createMpPreference, fetchAddresses } from "../services/api";
import { useToast } from "../context/ToastContext";
import LoadingOverlay from "../components/LoadingOverlay";
import { useLanguage } from "../context/LanguageContext";
import CheckoutDeliverySection from "../components/checkout/CheckoutDeliverySection";
import CheckoutPaymentSection from "../components/checkout/CheckoutPaymentSection";
import CheckoutSummary from "../components/checkout/CheckoutSummary";
import {
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
  const [useManualAddress, setUseManualAddress] = useState(false);
  const useManualAddressRef = useRef(useManualAddress);

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

  useEffect(() => {
    useManualAddressRef.current = useManualAddress;
  }, [useManualAddress]);

  // Cargar direcciones si eligió envío
  useEffect(() => {
    async function load() {
      if (!user || deliveryMethod !== "delivery") return;

      try {
        setLoadingAddresses(true);
        const data = await fetchAddresses();
        const nextAddresses = Array.isArray(data) ? data : [];
        setAddresses(nextAddresses);
        const def = (data || []).find((a) => a.isDefault);
        if (nextAddresses.length === 0) {
          setSelectedAddressId(null);
          setUseManualAddress(true);
        } else if (!useManualAddressRef.current) {
          setSelectedAddressId(def?.id ?? (data?.[0]?.id ?? null));
        }
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

  function handleManualToggle() {
    if (useManualAddress) {
      const def = addresses.find((a) => a.isDefault) ?? addresses[0];
      setSelectedAddressId(def?.id ?? null);
      setUseManualAddress(false);
      return;
    }

    setSelectedAddressId(null);
    setUseManualAddress(true);
  }

  const selectedAddr = selectedAddressId
    ? addresses.find((a) => a.id === selectedAddressId)
    : null;

  const buildAddressText = (selected) =>
    deliveryMethod !== "delivery"
      ? t("checkout.address.pickupLabel")
      : selected
        ? `${t("checkout.address.deliveryLabel")} - ${selected.label}: ${selected.street}, ${selected.city}, ${selected.province} ${selected.postalCode ? `(${t("checkout.address.postalCodePrefix")} ${selected.postalCode})` : ""}`
        : `${t("checkout.address.deliveryLabel")} - ${manualAddress.street}, ${manualAddress.city}, ${manualAddress.province} ${manualAddress.postalCode ? `(${t("checkout.address.postalCodePrefix")} ${manualAddress.postalCode})` : ""}`;

  const buildOrderPayload = (selected) => {
    const addressText = buildAddressText(selected);
    const composedNotes = [customer.notes, addressText].filter(Boolean).join("\n");

    return {
      items: items.map((it) => ({ productId: it.id, quantity: it.quantity })),
      customer: { ...customer, notes: composedNotes },
      paymentMethod,
      cashGiven: paymentMethod === "efectivo" ? cashGiven || null : null,
      // ✅ nuevos (aunque el backend no los persista aún, no rompen)
      deliveryMethod,
      addressId: deliveryMethod === "delivery" ? (selectedAddressId || null) : null,
      manualAddress: deliveryMethod === "delivery" && !selectedAddressId ? manualAddress : null,
    };
  };

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

      const orderPayload = buildOrderPayload(selectedAddr);

      const { order } = await createOrder(orderPayload);

      if (paymentMethod === "mercadopago") {
        const pref = await createMpPreference({ orderId: order.id });

        console.log("[MP][front] initPoint recibido:", pref.initPoint);

        clearCart();

        window.open(pref.initPoint, "_blank", "noopener,noreferrer");

        const params = new URLSearchParams();
        params.set("orderId", String(order.id));
        if (pref.preferenceId) {
          params.set("preferenceId", String(pref.preferenceId));
        }
        navigate(`/checkout/pending?${params.toString()}`);
        return;
      }

      setSuccessOrderId(order.id);
      clearCart();
    } catch (err) {
      console.error("[CHECKOUT] Error en handleSubmit:", err);
      if (err instanceof ApiError) {
        if (err.status === 401 || err.status === 403) {
          setError(t("checkout.errors.authRequired"));
          return;
        }
        if (err.status === 409) {
          setError(t("checkout.errors.stockConflict"));
          return;
        }
      }
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

         <CheckoutDeliverySection
          t={t}
          user={user}
          deliveryMethod={deliveryMethod}
          setDeliveryMethod={setDeliveryMethod}
          addresses={addresses}
          loadingAddresses={loadingAddresses}
          selectedAddressId={selectedAddressId}
          setSelectedAddressId={setSelectedAddressId}
          useManualAddress={useManualAddress}
          handleManualToggle={handleManualToggle}
          manualAddress={manualAddress}
          handleManualAddrChange={handleManualAddrChange}
        />

        <CheckoutPaymentSection
          t={t}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          cashGiven={cashGiven}
          setCashGiven={setCashGiven}
        />

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

      <CheckoutSummary t={t} items={items} totalPrice={totalPrice} />
    </div>
  </section>
);
}
export default Checkout;