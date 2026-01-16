import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMyOrderDetail, fetchMyOrders } from "../services/api";

const STATUS_LABELS = {
  pending: "Pendiente",
  paid: "Pagada",
  cancelled: "Cancelada",
};

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

function OrdersHistory() {
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [openOrderId, setOpenOrderId] = useState(null);
  const [detailById, setDetailById] = useState({});
  const [detailLoadingId, setDetailLoadingId] = useState(null);
  const [detailErrorById, setDetailErrorById] = useState({});

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
      setOrdersError(e.message || "No se pudieron cargar tus órdenes.");
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
          [orderId]: e.message || "No se pudo cargar el detalle.",
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
            <h1 className="profile-title">Mis pedidos</h1>
            <p className="profile-subtitle">
              Consultá el estado y detalle de tus compras recientes.
            </p>
          </div>
        </div>
        <div className="orders-hero-actions">
          <Link to="/tienda" className="btn-secondary btn-small">
            Seguir comprando
          </Link>
          <Link to="/perfil" className="btn-secondary btn-small">
            Volver al perfil
          </Link>
        </div>
      </section>

      <section className="profile-card card-animate">
        {loadingOrders ? (
          <p className="profile-muted">Cargando tus pedidos...</p>
        ) : ordersError ? (
          <p className="form-error">{ordersError}</p>
        ) : sortedOrders.length === 0 ? (
          <div className="orders-empty">
            <p className="profile-muted">Todavía no tenés pedidos registrados.</p>
            <Link to="/tienda" className="btn-primary btn-small">
              Ir a la tienda
            </Link>
          </div>
        ) : (
          <div className="orders-list">
            {sortedOrders.map((order) => {
              const statusKey = String(order?.status || "pending").toLowerCase();
              const detail = detailById[order.id];
              const detailError = detailErrorById[order.id];

              return (
                <article key={order.id} className="order-card">
                  <header className="order-card-header">
                    <div>
                      <span className="order-id">Orden #{order.id}</span>
                      <div className="order-meta">
                        <span className={`order-status status-${statusKey}`}>
                          {STATUS_LABELS[statusKey] || order.status}
                        </span>
                        <span className="order-date">
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleString("es-AR")
                            : "—"}
                        </span>
                      </div>
                    </div>
                    <div className="order-total">{formatCurrency(order.totalAmount)}</div>
                  </header>

                  <div className="order-details">
                    <div>
                      <span className="order-label">Método de pago</span>
                      <span className="order-value">
                        {order.paymentMethod || "—"}
                        {order.paymentBrand
                          ? ` · ${order.paymentBrand}${order.paymentLast4 ? ` •••• ${order.paymentLast4}` : ""}`
                          : ""}
                      </span>
                    </div>
                    <div>
                      <span className="order-label">Estado</span>
                      <span className="order-value">
                        {STATUS_LABELS[statusKey] || order.status}
                      </span>
                    </div>
                  </div>

                  <div className="order-actions">
                    <button
                      type="button"
                      className="btn-secondary btn-small"
                      onClick={() => handleToggleDetail(order.id)}
                    >
                      {openOrderId === order.id ? "Ocultar detalle" : "Ver detalle"}
                    </button>
                  </div>

                  {openOrderId === order.id && (
                    <div className="order-detail-panel">
                      {detailLoadingId === order.id ? (
                        <p className="profile-muted">Cargando detalle...</p>
                      ) : detailError ? (
                        <p className="form-error">{detailError}</p>
                      ) : (
                        <>
                          <div className="order-detail-summary">
                            <div>
                              <span className="order-label">Contacto</span>
                              <span className="order-value">
                                {detail?.customerName || order.customerName || "—"}
                              </span>
                              <span className="order-value">
                                {detail?.email || order.email || "—"}
                              </span>
                            </div>
                            <div>
                              <span className="order-label">Notas</span>
                              <span className="order-value">
                                {detail?.notes || "Sin notas"}
                              </span>
                            </div>
                          </div>

                          {(detail?.items || order.items || []).length === 0 ? (
                            <p className="profile-muted">No hay ítems asociados a esta orden.</p>
                          ) : (
                            <ul className="order-items">
                              {(detail?.items || order.items || []).map((item) => (
                                <li key={item.id} className="order-item">
                                  <div>
                                    <strong>{item.productName}</strong>
                                    <span className="order-item-qty">
                                      Cantidad: {item.quantity}
                                    </span>
                                  </div>
                                  <div className="order-item-prices">
                                    <span>{formatCurrency(item.unitPrice)}</span>
                                    <span className="order-item-subtotal">
                                      {formatCurrency(item.subtotal)}
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