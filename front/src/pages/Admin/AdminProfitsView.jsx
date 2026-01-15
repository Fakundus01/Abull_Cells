// src/components/admin/AdminProfitsView.jsx
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

function formatARS(value) {
  return `$${Number(value || 0).toLocaleString("es-AR")}`;
}

function TooltipBox({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value ?? 0;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{label}</div>
      <div className="chart-tooltip-value">{formatARS(v)}</div>
    </div>
  );
}

export default function AdminProfitsView({
  revenueToday,
  revenueWeek,
  revenueMonth,
  revenueYear,
  revenue14d,
  icons,
  cardAnimateClass = "",
}) {
  const { ClipboardList } = icons;

  const data = (revenue14d || []).map((d) => ({
    date: String(d.date).slice(5), // MM-DD
    total: Number(d.total || 0),
    fullDate: d.date,
  }));

  return (
    <div className={`admin-card ${cardAnimateClass}`} style={{ marginTop: 16 }}>
      <div className="admin-card-header">
        <h2 className="admin-card-title">
          <ClipboardList size={18} className="icon" /> Ganancias
        </h2>
      </div>

      <p className="admin-muted">
        Se calculan con órdenes <strong>pagadas</strong> (status = <strong>paid</strong>).
      </p>

      <div className="gains-grid">
        <div className="gains-kpis">
          <div className="gains-kpi">
            <span>Hoy</span>
            <strong className="gains-kpi-value">{formatARS(revenueToday)}</strong>
          </div>
          <div className="gains-kpi">
            <span>Semana</span>
            <strong className="gains-kpi-value">{formatARS(revenueWeek)}</strong>
          </div>
          <div className="gains-kpi">
            <span>Mes</span>
            <strong className="gains-kpi-value">{formatARS(revenueMonth)}</strong>
          </div>
          <div className="gains-kpi">
            <span>Año</span>
            <strong className="gains-kpi-value">{formatARS(revenueYear)}</strong>
          </div>
        </div>

        <div className="gains-chart">
          <div className="gains-chart-head">
            <strong>Últimos 14 días</strong>
            <span className="admin-muted">Ingresos diarios</span>
          </div>

          <div className="gains-chart-canvas">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gainsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#0ea5e9" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickMargin={8} />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={40} />
                <Tooltip content={<TooltipBox />} />
                <Bar dataKey="total" radius={[10, 10, 10, 10]} fill="url(#gainsGradient)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
