// src/components/admin/AdminPaymentsView.jsx
export default function AdminPaymentsView({
  orders,
  pagedOrders,
  loadingOrders,
  ordersPage,
  totalOrderPages,
  pageSize,
  onChangeStatus,
  onPrevPage,
  onNextPage,
  icons,
  cardAnimateClass = "",
}) {
  const { ClipboardList, Loader2, CreditCard, CalendarDays } = icons;

  return (
    <>
      <div className={`admin-card ${cardAnimateClass}`} style={{ marginTop: 16 }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            <ClipboardList size={18} className="icon" /> Pagos / Órdenes
          </h2>
        </div>

        {loadingOrders ? (
          <p className="admin-muted">
            <Loader2 size={16} className="icon spin" /> Cargando órdenes...
          </p>
        ) : orders.length === 0 ? (
          <p className="admin-muted">Todavía no hay órdenes registradas.</p>
        ) : (
          <div className="admin-orders-table modern">
            <div className="admin-orders-header">
              <span>#</span>
              <span>Cliente</span>
              <span>Método</span>
              <span>Fecha</span>
              <span>Estado</span>
              <span>Total</span>
            </div>

            {pagedOrders.map((o) => (
              <div key={o.id} className="admin-orders-row">
                <span className="cell-strong">#{o.id}</span>
                <span>{o.customerName}</span>

                <span className="cell-muted">
                  <CreditCard size={14} className="icon" /> {o.paymentMethod}
                </span>

                <span className="cell-muted">
                  <CalendarDays size={14} className="icon" />{" "}
                  {o.createdAt ? new Date(o.createdAt).toLocaleString("es-AR") : "—"}
                </span>

                <span>
                  <select
                    className={`status-select ${o.status}`}
                    value={o.status}
                    onChange={(e) => onChangeStatus(o.id, e.target.value)}
                  >
                    <option value="pending">Pendiente</option>
                    <option value="paid">Pagada</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </span>

                <span className="cell-strong">${Number(o.totalAmount || 0).toLocaleString("es-AR")}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="admin-pagination">
        <span className="admin-muted">
          Mostrando{" "}
          <strong>{orders.length === 0 ? 0 : (ordersPage - 1) * pageSize + 1}</strong> –{" "}
          <strong>{Math.min(ordersPage * pageSize, orders.length)}</strong> de{" "}
          <strong>{orders.length}</strong>
        </span>

        <div className="admin-pagination-actions">
          <button type="button" className="btn-small" onClick={onPrevPage} disabled={ordersPage === 1}>
            Anterior
          </button>

          <span className="page-pill">
            {ordersPage}/{totalOrderPages}
          </span>

          <button
            type="button"
            className="btn-small"
            onClick={onNextPage}
            disabled={ordersPage === totalOrderPages}
          >
            Siguiente
          </button>
        </div>
      </div>
    </>
  );
}
