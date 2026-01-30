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
  const { ClipboardList, Loader2, CreditCard, CalendarDays, Printer } = icons;
  const locale = language === "en" ? "en-US" : "es-AR";
  const formatCurrency = (amount) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: "ARS" }).format(
      Number(amount || 0)
    );
  const statusLabels = {
    pending: t("admin.payments.status.pending"),
    paid: t("admin.payments.status.paid"),
    cancelled: t("admin.payments.status.cancelled"),
  };

  const getOrderItems = (order) => {
    if (Array.isArray(order?.items)) return order.items;
    if (Array.isArray(order?.orderItems)) return order.orderItems;
    if (Array.isArray(order?.products)) return order.products;
    return [];
  };

  function handlePrint(order) {
    const items = getOrderItems(order);
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;

    const formatDate = (value) =>
      value ? new Date(value).toLocaleString(locale) : t("admin.payments.print.emptyValue");
    const statusKey = String(order?.status || "pending").toLowerCase();
    const statusLabel = statusLabels[statusKey] || order?.status || t("admin.payments.print.emptyValue");
    const totalAmount = formatCurrency(order?.totalAmount);

    const itemsHtml =
      items.length === 0
        ? `<p class="empty-items">${t("admin.payments.print.emptyItems")}</p>`
        : `<table class="items-table">
            <thead>
              <tr>
                <th>${t("admin.payments.print.headers.item")}</th>
                <th>${t("admin.payments.print.headers.quantity")}</th>
                <th>${t("admin.payments.print.headers.price")}</th>
                <th>${t("admin.payments.print.headers.subtotal")}</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map((item) => {
                  const quantity = item?.quantity ?? item?.qty ?? item?.count ?? 1;
                  const price = item?.price ?? item?.unitPrice ?? item?.unit_price ?? item?.total ?? 0;
                  const subtotal =
                    item?.subtotal ?? item?.total ?? Number(quantity || 0) * Number(price || 0);
                  const name =
                    item?.name ||
                    item?.title ||
                    item?.productName ||
                    item?.product?.name ||
                    t("admin.payments.print.fallbackItem");
                  return `<tr>
                    <td>${name}</td>
                    <td>${quantity}</td>
                    <td>${formatCurrency(price)}</td>
                    <td>${formatCurrency(subtotal)}</td>
                  </tr>`;
                })
                .join("")}
            </tbody>
          </table>`;

    const notes = order?.notes || order?.comment || order?.observations;
    const notesHtml = notes
      ? `<div class="notes">
          <h3>${t("admin.payments.print.notes")}</h3>
          <p>${notes}</p>
        </div>`
      : "";

    printWindow.document.write(`
      <html lang="${language}">
        <head>
          <meta charset="UTF-8" />
          <title>${t("admin.payments.print.title", { id: order?.id })}</title>
          <style>
            :root { color-scheme: light; }
            body { font-family: "Inter", "Segoe UI", sans-serif; margin: 24px; color: #0f172a; }
            h1 { font-size: 20px; margin-bottom: 12px; }
            h2 { font-size: 16px; margin: 16px 0 8px; }
            h3 { font-size: 14px; margin-bottom: 6px; }
            .summary { display: grid; gap: 8px; margin-bottom: 16px; }
            .summary-row { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
            .label { font-weight: 600; color: #334155; }
            .value { font-weight: 700; }
            .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .items-table th, .items-table td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
            .items-table th { background: #f8fafc; font-size: 13px; }
            .total { margin-top: 12px; font-size: 16px; font-weight: 700; text-align: right; }
            .notes { margin-top: 16px; padding: 12px; border: 1px dashed #cbd5f5; border-radius: 10px; }
            .empty-items { font-size: 14px; color: #64748b; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="text-align:right; margin-bottom: 16px;">
            <button onclick="window.print()" style="padding:8px 14px; border-radius: 10px; border: none; background: #0ea5e9; color: #fff; font-weight: 600;">
              ${t("admin.payments.print.action")}
            </button>
          </div>
          <h1>${t("admin.payments.print.title", { id: order?.id })}</h1>
          <div class="summary">
            <div class="summary-row">
              <span class="label">${t("admin.payments.print.customer")}</span>
              <span class="value">${order?.customerName || t("admin.payments.print.emptyValue")}</span>
            </div>
            <div class="summary-row">
              <span class="label">${t("admin.payments.print.email")}</span>
              <span class="value">${order?.email || t("admin.payments.print.emptyValue")}</span>
            </div>
            <div class="summary-row">
              <span class="label">${t("admin.payments.print.date")}</span>
              <span class="value">${formatDate(order?.createdAt)}</span>
            </div>
            <div class="summary-row">
              <span class="label">${t("admin.payments.print.status")}</span>
              <span class="value">${statusLabel}</span>
            </div>
            <div class="summary-row">
              <span class="label">${t("admin.payments.print.method")}</span>
              <span class="value">${order?.paymentMethod || t("admin.payments.print.emptyValue")}</span>
            </div>
          </div>

          <h2>${t("admin.payments.print.items")}</h2>
          ${itemsHtml}
          <div class="total">${t("admin.payments.print.total")}: ${totalAmount}</div>
          ${notesHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  }

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
              <span>{t("admin.payments.headers.actions")}</span>
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
                <span className="admin-orders-actions">
                  <button
                    type="button"
                    className="btn-small"
                    onClick={() => handlePrint(o)}
                    title={t("admin.payments.print.action")}
                  >
                    <Printer size={14} className="icon" /> {t("admin.payments.print.action")}
                  </button>
                </span>
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
