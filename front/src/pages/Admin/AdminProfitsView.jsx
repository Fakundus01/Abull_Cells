// src/components/admin/AdminProfitsView.jsx
import { useMemo, useState } from "react";
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
  revenueWeekSeries,
  revenueMonthSeries,
  revenueYearSeries,
  icons,
  cardAnimateClass = "",
}) {
  const { ClipboardList } = icons;
  const [range, setRange] = useState("week");

  const data = useMemo(() => {
    if (range === "month") return revenueMonthSeries || [];
    if (range === "year") return revenueYearSeries || [];
    return (revenueWeekSeries || []).map((item, idx) => ({
      ...item,
      fallbackLabel: String(revenue14d?.[idx]?.date || "").slice(5),
    }));
  }, [range, revenueMonthSeries, revenueYearSeries, revenueWeekSeries, revenue14d]);

  const chartTitle = useMemo(() => {
    if (range === "month") return "Últimos 12 meses";
    if (range === "year") return "Últimos 5 años";
    return "Últimos 7 días";
  }, [range]);

  return (
    <div className={`admin-card ${cardAnimateClass}`} style={{ marginTop: 16 }}>
      <div className="admin-card-header">
        <h2 className="admin-card-title">
          <ClipboardList size={18} className="icon" /> Ganancias
        </h2>
      </div>

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
           <div>
              <strong>{chartTitle} </strong>
              <span className="admin-muted">Ingresos por período</span>
            </div>

            <div className="gains-range">
              {[
                { key: "week", label: "Semana" },
                { key: "month", label: "Mes" },
                { key: "year", label: "Año" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`gains-range-btn ${range === item.key ? "active" : ""}`}
                  onClick={() => setRange(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div> 
          </div>

          <div className="gains-chart-canvas">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }} barSize={36}>
                <defs>
                  <linearGradient id="gainsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#0ea5e9" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="6 6" />
                <XAxis
                  dataKey="label"
                  tickMargin={8}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                  width={40}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                />
                <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(56,189,248,.08)" }} />
                <Bar dataKey="total" radius={[10, 10, 10, 10]} fill="url(#gainsGradient)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
