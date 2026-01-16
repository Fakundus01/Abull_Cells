// src/components/admin/AdminPaymentsView.jsx
import { useLanguage } from "../../context/LanguageContext";
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
  const { t, language } = useLanguage();
  const { ClipboardList, Loader2, CreditCard, CalendarDays } = icons;
  const locale = language === "en" ? "en-US" : "es-AR";

  return (
    <>
      <div className={`admin-card ${cardAnimateClass}`} style={{ marginTop: 16 }}>
        <div className="admin-card-header">
          <h2 className="admin-card-title">
            <ClipboardList size={18} className="icon" /> {t("admin.payments.title")}
          </h2>
        </div>

        {loadingOrders ? (
          <p className="admin-muted">
            <Loader2 size={16} className="icon spin" /> {t("admin.payments.loading")}
          </p>
        ) : orders.length === 0 ? (
          <p className="admin-muted">{t("admin.payments.empty")}</p>
        ) : (
          <div className="admin-orders-table modern">
            <div className="admin-orders-header">
              <span>#</span>
              <span>{t("admin.payments.headers.customer")}</span>
              <span>{t("admin.payments.headers.method")}</span>
              <span>{t("admin.payments.headers.date")}</span>
              <span>{t("admin.payments.headers.status")}</span>
              <span>{t("admin.payments.headers.total")}</span>
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
                  {o.createdAt ? new Date(o.createdAt).toLocaleString(locale) : "—"}
                </span>

                <span>
                  <select
                    className={`status-select ${o.status}`}
                    value={o.status}
                    onChange={(e) => onChangeStatus(o.id, e.target.value)}
                  >
                    <option value="pending">{t("admin.payments.status.pending")}</option>
                    <option value="paid">{t("admin.payments.status.paid")}</option>
                    <option value="cancelled">{t("admin.payments.status.cancelled")}</option>
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
          {t("admin.pagination.showing", {
            start: orders.length === 0 ? 0 : (ordersPage - 1) * pageSize + 1,
            end: Math.min(ordersPage * pageSize, orders.length),
            total: orders.length,
          })}
        </span>

        <div className="admin-pagination-actions">
          <button type="button" className="btn-small" onClick={onPrevPage} disabled={ordersPage === 1}>
           {t("admin.pagination.prev")}
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
            {t("admin.pagination.next")}
          </button>
        </div>
      </div>
    </>
  );
}
