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
  const formatCurrency = (amount, { withDecimals = true } = {}) => {
    const options = withDecimals
      ? { style: "currency", currency: "ARS" }
      : { style: "currency", currency: "ARS", maximumFractionDigits: 0 };
    return new Intl.NumberFormat(locale, options).format(Number(amount || 0));
  };
  const fallbackIfKey = (value, fallback) => (value?.startsWith?.("admin.") ? fallback : value);
  const printActionLabel = fallbackIfKey(t("admin.payments.print.action"), "Imprimir");
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

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  function handlePrint(order) {
    const items = getOrderItems(order);
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;

    const formatDate = (value) =>
      value ? new Date(value).toLocaleString(locale) : t("admin.payments.print.emptyValue");
    const statusKey = String(order?.status || "pending").toLowerCase();
    const statusLabel = statusLabels[statusKey] || order?.status || t("admin.payments.print.emptyValue");
    const totalAmount = formatCurrency(order?.totalAmount, { withDecimals: false });

    const ticketWidth = 32;
    const separator = "-".repeat(ticketWidth);
    const labelWidth = 10;
    const blankLabel = " ".repeat(labelWidth);

    const wrapText = (text, width) => {
      const words = String(text || "").split(/\s+/).filter(Boolean);
      if (words.length === 0) return [""];
      const lines = [];
      let line = "";
      words.forEach((word) => {
        const next = line ? `${line} ${word}` : word;
        if (next.length > width) {
          if (line) lines.push(line);
          line = word;
        } else {
          line = next;
        }
      });
      if (line) lines.push(line);
      return lines;
    };

    const keyValueLine = (label, value) => {
      const lines = wrapText(value || t("admin.payments.print.emptyValue"), ticketWidth - labelWidth);
      return lines
        .map((line, index) => `${index === 0 ? label.padEnd(labelWidth) : blankLabel}${line}`)
        .join("\n");
    };

    const formatItemLine = (name, quantity, subtotal) => {
      const amount = formatCurrency(subtotal, { withDecimals: false });
      const amountWidth = Math.max(10, amount.length + 1);
      const nameWidth = ticketWidth - amountWidth;
      const label = `${name} x${quantity}`;
      const wrapped = wrapText(label, nameWidth);
      return wrapped
        .map((line, index) =>
          index === 0
            ? `${line.padEnd(nameWidth)}${amount.padStart(amountWidth)}`
            : `${line.padEnd(nameWidth)}${"".padStart(amountWidth)}`
        )
        .join("\n");
    };

    const customerName = order?.customerName || order?.customer?.name;
    const email = order?.email || order?.customer?.email;
    const phone = order?.phone || order?.customerPhone || order?.customer?.phone;
    const paymentMethod = order?.paymentMethod || order?.payment_method;
    const notes = order?.notes || order?.comment || order?.observations;
    const deliveryMethod = order?.deliveryMethod || order?.delivery_method;
    const deliveryLabel =
      deliveryMethod === "delivery"
        ? t("admin.payments.print.deliveryLabel")
        : t("admin.payments.print.pickupLabel");
    const deliveryInstruction =
      deliveryMethod === "delivery"
        ? t("admin.payments.print.deliveryInstruction")
        : t("admin.payments.print.pickupInstruction");

    const itemLines =
      items.length === 0
        ? t("admin.payments.print.emptyItems")
        : items
            .map((item) => {
              const quantity = item?.quantity ?? item?.qty ?? item?.count ?? 1;
              const price = item?.price ?? item?.unitPrice ?? item?.unit_price ?? 0;
              const subtotal =
                item?.subtotal ?? item?.total ?? Number(quantity || 0) * Number(price || 0);
              const name =
                item?.name ||
                item?.title ||
                item?.productName ||
                item?.product?.name ||
                t("admin.payments.print.fallbackItem");
              return formatItemLine(name, quantity, subtotal);
            })
            .join("\n");

    const notesBlock = notes
      ? `${t("admin.payments.print.notes")}\n${wrapText(notes, ticketWidth).join("\n")}\n${separator}`
      : "";
    const deliveryBlock =
      deliveryLabel && deliveryInstruction
        ? `${deliveryLabel}\n${wrapText(deliveryInstruction, ticketWidth).join("\n")}\n${separator}`
        : "";

    const amountLabel = t("admin.payments.print.amount");
    const ticketLines = [
      t("admin.payments.print.brand").toUpperCase(),
      separator,
      t("admin.payments.print.ticketTitle"),
      separator,
      keyValueLine(t("admin.payments.print.orderLabel"), `#${order?.id ?? ""}`),
      keyValueLine(t("admin.payments.print.date"), formatDate(order?.createdAt)),
      keyValueLine(t("admin.payments.print.customer"), customerName),
      keyValueLine(t("admin.payments.print.email"), email),
      keyValueLine(t("admin.payments.print.phone"), phone),
      keyValueLine(t("admin.payments.print.method"), paymentMethod),
      keyValueLine(t("admin.payments.print.status"), statusLabel),
      separator,
      `${t("admin.payments.print.items").padEnd(ticketWidth - amountLabel.length)}${amountLabel}`,
      itemLines,
      separator,
      `${t("admin.payments.print.total").padEnd(ticketWidth - totalAmount.length)}${totalAmount}`,
      separator,
      notesBlock,
      deliveryBlock,
      t("admin.payments.print.actionLine"),
    ]
      .filter(Boolean)
      .join("\n");

    printWindow.document.write(`
      <html lang="${language}">
        <head>
          <meta charset="UTF-8" />
          <title>${t("admin.payments.print.title", { id: order?.id })}</title>
          <style>
            :root { color-scheme: light; }
            body { font-family: "Courier New", "Courier", monospace; margin: 0; color: #0f172a; }
            .ticket { padding: 12px; }
            pre { margin: 0; font-size: 12px; line-height: 1.35; white-space: pre-wrap; }
            @media print {
              .no-print { display: none; }
            }
            @page { size: 80mm auto; margin: 4mm; }
          </style>
        </head>
        <body>
          <div class="no-print" style="text-align:right; margin-bottom: 16px;">
            <button onclick="window.print()" style="padding:8px 14px; border-radius: 10px; border: none; background: #0ea5e9; color: #fff; font-weight: 600;">
              ${printActionLabel}
            </button>
          </div>
          <div class="ticket">
            <pre>${escapeHtml(ticketLines)}</pre>
          </div>
        </body>
        <script>
          window.onload = () => setTimeout(() => window.print(), 200);
        </script>
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
