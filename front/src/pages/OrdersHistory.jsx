import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMyOrderDetail, fetchMyOrders } from "../services/api";
import { useLanguage } from "../context/LanguageContext";

function formatCurrency(value, locale) {
  return Number(value || 0).toLocaleString(locale, {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

function formatPaymentMethod(method, t) {
  const raw = String(method || "").toLowerCase();
  if (!raw) {
    return { label: t("orders.emptyValue"), emoji: "💳" };
  }

  if (raw.includes("mercadopago") && /account[_-]?money/.test(raw)) {
    return { label: t("orders.paymentMethods.mercadopagoAccountMoney"), emoji: "💳" };
  }
  if (raw.includes("mercadopago")) {
    return { label: t("orders.paymentMethods.mercadopago"), emoji: "💳" };
  }
  if (raw.includes("efectivo") || raw.includes("cash")) {
    return { label: t("orders.paymentMethods.cash"), emoji: "💵" };
  }
  if (raw.includes("tarjeta") || raw.includes("card")) {
    return { label: t("orders.paymentMethods.card"), emoji: "💳" };
  }
  return { label: method, emoji: "💳" };
}

function OrdersHistory() {
  const { t, language } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [openOrderId, setOpenOrderId] = useState(null);
  const [detailById, setDetailById] = useState({});
  const [detailLoadingId, setDetailLoadingId] = useState(null);
  const [detailErrorById, setDetailErrorById] = useState({});

  const statusLabels = useMemo(
    () => ({
      pending: t("orders.status.pending"),
      paid: t("orders.status.paid"),
      cancelled: t("orders.status.cancelled"),
    }),
    [t]
  );

  useEffect(() => {
    loadOrders();
  }, []);

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const aDate = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });
  }, [orders]);

  async function loadOrders() {
    try {
      setLoadingOrders(true);
      setOrdersError("");
      const data = await fetchMyOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setOrdersError(e.message || t("orders.errors.load"));
    } finally {
      setLoadingOrders(false);
    }
  }

  async function handleToggleDetail(orderId) {
    if (openOrderId === orderId) {
      setOpenOrderId(null);
      return;
    }

    setOpenOrderId(orderId);

    if (!detailById[orderId]) {
      try {
        setDetailLoadingId(orderId);
        setDetailErrorById((prev) => ({ ...prev, [orderId]: "" }));
        const detail = await fetchMyOrderDetail(orderId);
        setDetailById((prev) => ({ ...prev, [orderId]: detail }));
      } catch (e) {
        setDetailErrorById((prev) => ({
          ...prev,
          [orderId]: e.message || t("orders.errors.detail"),
        }));
      } finally {
        setDetailLoadingId(null);
      }
    }
  }

  return (
    <main className="home-section orders-page">
      <section className="profile-card card-animate orders-hero">
        <div className="profile-head">
          <div className="profile-icon">🧾</div>
          <div>
            <h1 className="profile-title">{t("orders.title")}</h1>
            <p className="profile-subtitle">
              {t("orders.subtitle")}
            </p>
          </div>
        </div>
        <div className="orders-hero-actions">
          <Link to="/tienda" className="btn-secondary btn-small">
            {t("orders.actions.shop")}
          </Link>
          <Link to="/perfil" className="btn-secondary btn-small">
            {t("orders.actions.profile")}
          </Link>
        </div>
      </section>

      <section className="profile-card card-animate">
        {loadingOrders ? (
          <p className="profile-muted">{t("orders.loading")}</p>
        ) : ordersError ? (
          <p className="form-error">{ordersError}</p>
        ) : sortedOrders.length === 0 ? (
          <div className="orders-empty">
            <p className="profile-muted">{t("orders.empty")}</p>
            <Link to="/tienda" className="btn-primary btn-small">
              {t("orders.actions.store")}
            </Link>
          </div>
        ) : (
          <div className="orders-list">
            {sortedOrders.map((order) => {
              const statusKey = String(order?.status || "pending").toLowerCase();
              const detail = detailById[order.id];
              const detailError = detailErrorById[order.id];
              const paymentDisplay = formatPaymentMethod(
                order.paymentMethod || order.payment_method,
                t
              );

              return (
                <article key={order.id} className="order-card">
                  <header className="order-card-header">
                    <div>
                      <span className="order-id">
                        {t("orders.labels.orderId", { id: order.id })}
                      </span>
                      <div className="order-meta">
                        <span className={`order-status status-${statusKey}`}>
                          {statusLabels[statusKey] || order.status}
                        </span>
                        <span className="order-date">
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleDateString(language)
                            : t("orders.emptyValue")}
                        </span>
                      </div>
                    </div>
                    <div className="order-total">
                      {formatCurrency(order.totalAmount, language)}
                    </div>
                  </header>

                  <div className="order-details">
                    <div>
                      <span className="order-label">{t("orders.labels.payment")}</span>
                      <span className="order-value">
                         <span className="payment-method">
                          <span className="payment-method-emoji">{paymentDisplay.emoji}</span>
                          <span className="payment-method-text">{paymentDisplay.label}</span>
                        </span>
                        {order.paymentBrand
                          ? ` · ${order.paymentBrand}${order.paymentLast4 ? ` •••• ${order.paymentLast4}` : ""}`
                          : ""}
                      </span>
                    </div>
                    <div>
                      <span className="order-label">{t("orders.labels.status")}</span>
                      <span className="order-value">
                        {statusLabels[statusKey] || order.status}
                      </span>
                    </div>
                  </div>

                  <div className="order-actions">
                    <button
                      type="button"
                      className="btn-secondary btn-small"
                      onClick={() => handleToggleDetail(order.id)}
                    >
                      {openOrderId === order.id
                        ? t("orders.actions.hideDetail")
                        : t("orders.actions.viewDetail")}
                    </button>
                  </div>

                  {openOrderId === order.id && (
                    <div className="order-detail-panel">
                      {detailLoadingId === order.id ? (
                        <p className="profile-muted">{t("orders.detail.loading")}</p>
                      ) : detailError ? (
                        <p className="form-error">{detailError}</p>
                      ) : (
                        <>
                          <div className="order-detail-summary">
                            <div>
                              <span className="order-label">{t("orders.detail.contact")}</span>
                              <span className="order-value">
                                {detail?.customerName || order.customerName || t("orders.emptyValue")}
                              </span>
                              <span className="order-value">
                                {detail?.email || order.email || t("orders.emptyValue")}
                              </span>
                            </div>
                            <div>
                              <span className="order-label">{t("orders.detail.notes")}</span>
                              <span className="order-value">
                                {detail?.notes || t("orders.detail.noNotes")}
                              </span>
                            </div>
                          </div>

                          {(detail?.items || order.items || []).length === 0 ? (
                            <p className="profile-muted">{t("orders.detail.noItems")}</p>
                          ) : (
                            <ul className="order-items">
                              {(detail?.items || order.items || []).map((item) => (
                                <li key={item.id} className="order-item">
                                  <div>
                                    <strong>{item.productName}</strong>
                                    <span className="order-item-qty">
                                      {t("orders.detail.quantity", { count: item.quantity })}
                                    </span>
                                  </div>
                                  <div className="order-item-prices">
                                    <span>{formatCurrency(item.unitPrice, language)}</span>
                                    <span className="order-item-subtotal">
                                      {formatCurrency(item.subtotal, language)}
                                    </span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
export default OrdersHistory;