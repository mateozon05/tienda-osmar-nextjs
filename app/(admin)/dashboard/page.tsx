import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente", procesando: "Procesando", enviado: "Enviado",
  entregado: "Entregado", aprobado: "Aprobado", rechazado: "Rechazado", cancelado: "Cancelado",
};

async function getStats() {
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  const sevenAgo   = new Date(now); sevenAgo.setDate(sevenAgo.getDate() - 6); sevenAgo.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    todayCount, revenueAgg, pendingCount, deliveredToday, recent, lastFive, pendingUsers,
    // SIPE stats
    sipeMonthAgg, sipePrevMonthAgg, topSalespersons, topClients,
  ] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: todayStart, lte: todayEnd }, importedFromSipe: false } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: todayStart, lte: todayEnd }, status: { in: ["aprobado", "enviado", "entregado"] }, importedFromSipe: false },
    }),
    prisma.order.count({ where: { status: "pendiente", importedFromSipe: false } }),
    prisma.order.count({ where: { status: "entregado", updatedAt: { gte: todayStart, lte: todayEnd }, importedFromSipe: false } }),
    prisma.order.findMany({ where: { createdAt: { gte: sevenAgo }, importedFromSipe: false }, select: { createdAt: true, total: true } }),
    prisma.order.findMany({
      take: 5, orderBy: { createdAt: "desc" },
      where: { importedFromSipe: false },
      select: { id: true, guestName: true, guestEmail: true, total: true, status: true, createdAt: true, user: { select: { name: true, email: true } } },
    }),
    prisma.user.count({ where: { status: "pending" } }),
    // SIPE mes actual
    prisma.order.aggregate({
      _sum: { total: true },
      _count: { id: true },
      where: { importedFromSipe: true, orderDate: { gte: monthStart } },
    }),
    // SIPE mes anterior
    prisma.order.aggregate({
      _sum: { total: true },
      _count: { id: true },
      where: { importedFromSipe: true, orderDate: { gte: prevMonthStart, lte: prevMonthEnd } },
    }),
    // Top 5 vendedores del mes (SIPE)
    prisma.order.groupBy({
      by: ["salespersonId", "salespersonName"],
      where: { importedFromSipe: true, orderDate: { gte: monthStart }, salespersonId: { not: null } },
      _sum: { total: true },
      _count: { id: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    }),
    // Top 5 clientes del mes (SIPE)
    prisma.order.groupBy({
      by: ["clientCode", "clientName"],
      where: { importedFromSipe: true, orderDate: { gte: monthStart }, clientCode: { not: null } },
      _sum: { total: true },
      _count: { id: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    }),
  ]);

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const dayOrders = recent.filter((o) => o.createdAt.toISOString().slice(0, 10) === dateStr);
    return { date: dateStr, label: d.toLocaleDateString("es-AR", { weekday: "short" }), count: dayOrders.length, revenue: dayOrders.reduce((s, o) => s + o.total, 0) };
  });

  const sipeMonth     = { total: sipeMonthAgg._sum.total ?? 0,     count: sipeMonthAgg._count.id };
  const sipePrevMonth = { total: sipePrevMonthAgg._sum.total ?? 0, count: sipePrevMonthAgg._count.id };
  const sipeGrowth    = sipePrevMonth.total > 0
    ? ((sipeMonth.total - sipePrevMonth.total) / sipePrevMonth.total) * 100
    : 0;

  return {
    todayCount, revenue: revenueAgg._sum.total ?? 0, pendingCount, deliveredToday,
    chartData, lastFive, pendingUsers,
    sipeMonth, sipePrevMonth, sipeGrowth,
    topSalespersons, topClients,
  };
}

export default async function DashboardPage() {
  const { todayCount, revenue, pendingCount, deliveredToday, chartData, lastFive, pendingUsers,
    sipeMonth, sipeGrowth, topSalespersons, topClients } = await getStats();
  const maxCount = Math.max(...chartData.map((d) => d.count), 1);

  const cards = [
    { label: "Órdenes hoy", value: todayCount, icon: "📦", color: "blue" },
    { label: "Ingresos hoy", value: `$${revenue.toLocaleString("es-AR")}`, icon: "💰", color: "green" },
    { label: "Pendientes", value: pendingCount, icon: "⏳", color: "orange" },
    { label: "Entregadas hoy", value: deliveredToday, icon: "✅", color: "teal" },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Dashboard</h1>
        <span className="admin-page-date">
          {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
        </span>
      </div>

      {/* Stat cards */}
      <div className="stats-grid">
        {cards.map((c) => (
          <div key={c.label} className={`stat-card stat-card--${c.color}`}>
            <div className="stat-icon">{c.icon}</div>
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Pending users alert */}
      {pendingUsers > 0 && (
        <Link href="/users" className="pending-users-alert">
          <span className="pending-users-icon">👤</span>
          <span className="pending-users-text">
            <strong>{pendingUsers} usuario{pendingUsers > 1 ? "s" : ""} pendiente{pendingUsers > 1 ? "s" : ""}</strong>
            {" "}de aprobación
          </span>
          <span className="pending-users-badge">{pendingUsers}</span>
          <span className="pending-users-arrow">→</span>
        </Link>
      )}

      {/* SIPE stats section */}
      <div className="dash-sipe-section">
        <div className="dash-sipe-header">
          <h2 className="dash-sipe-title">📋 Historial SIPE — Mes actual</h2>
          <Link href="/orders/history" className="dash-sipe-link">Ver historial completo →</Link>
        </div>
        <div className="dash-sipe-cards">
          <div className="dash-sipe-card">
            <div className="dash-sipe-val">{sipeMonth.count.toLocaleString("es-AR")}</div>
            <div className="dash-sipe-lbl">Órdenes este mes</div>
          </div>
          <div className="dash-sipe-card dash-sipe-card--accent">
            <div className="dash-sipe-val">${sipeMonth.total.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
            <div className="dash-sipe-lbl">Ventas este mes</div>
          </div>
          <div className={`dash-sipe-card${sipeGrowth >= 0 ? " dash-sipe-card--up" : " dash-sipe-card--down"}`}>
            <div className="dash-sipe-val">{sipeGrowth >= 0 ? "▲" : "▼"} {Math.abs(sipeGrowth).toFixed(1)}%</div>
            <div className="dash-sipe-lbl">vs mes anterior</div>
          </div>
        </div>

        <div className="dash-sipe-grid">
          {/* Top vendedores */}
          <div className="dash-sipe-table-wrap">
            <h3 className="dash-sipe-subtitle">🏆 Top Vendedores del mes</h3>
            <table className="dash-sipe-table">
              <thead><tr><th>Vendedor</th><th>Órdenes</th><th>Ventas</th></tr></thead>
              <tbody>
                {topSalespersons.length === 0
                  ? <tr><td colSpan={3} style={{ textAlign: "center", color: "#9CA3AF", padding: "12px" }}>Sin datos</td></tr>
                  : topSalespersons.map((sp, i) => (
                  <tr key={i}>
                    <td>{sp.salespersonName ?? `#${sp.salespersonId}`}</td>
                    <td>{sp._count.id}</td>
                    <td>${(sp._sum.total ?? 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top clientes */}
          <div className="dash-sipe-table-wrap">
            <h3 className="dash-sipe-subtitle">👥 Top Clientes del mes</h3>
            <table className="dash-sipe-table">
              <thead><tr><th>Cliente</th><th>Órdenes</th><th>Compras</th></tr></thead>
              <tbody>
                {topClients.length === 0
                  ? <tr><td colSpan={3} style={{ textAlign: "center", color: "#9CA3AF", padding: "12px" }}>Sin datos</td></tr>
                  : topClients.map((c, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: ".85rem" }}>{c.clientName ?? "—"}</div>
                      {c.clientCode && <div style={{ fontSize: ".75rem", color: "#9CA3AF" }}>[{c.clientCode}]</div>}
                    </td>
                    <td>{c._count.id}</td>
                    <td>${(c._sum.total ?? 0).toLocaleString("es-AR", { maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Chart + last orders */}
      <div className="dashboard-grid">
        <div className="admin-card">
          <h3 className="admin-card-title">Órdenes — últimos 7 días</h3>
          <div className="chart-wrap">
            {chartData.map((day) => (
              <div key={day.date} className="chart-col">
                <div className="chart-bar-outer">
                  <div
                    className="chart-bar-inner"
                    style={{ height: `${(day.count / maxCount) * 100}%` }}
                    title={`${day.count} órden${day.count !== 1 ? "es" : ""} · $${day.revenue.toLocaleString("es-AR")}`}
                  />
                </div>
                <span className="chart-label">{day.label}</span>
                <span className="chart-count">{day.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-head">
            <h3 className="admin-card-title">Últimas órdenes</h3>
            <Link href="/orders" className="admin-link">Ver todas →</Link>
          </div>
          <div className="mini-orders">
            {lastFive.length === 0 && <p className="admin-empty">Aún no hay órdenes.</p>}
            {lastFive.map((o) => {
              const name = o.guestName ?? o.user?.name ?? "—";
              const email = o.guestEmail ?? o.user?.email ?? "—";
              return (
                <Link key={o.id} href={`/orders/${o.id}`} className="mini-order">
                  <span className="mini-order-id">#{o.id}</span>
                  <div className="mini-order-info">
                    <span className="mini-order-name">{name}</span>
                    <span className="mini-order-email">{email}</span>
                  </div>
                  <span className="mini-order-total">${o.total.toLocaleString("es-AR")}</span>
                  <span className={`status-badge status-badge--${o.status}`}>
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
