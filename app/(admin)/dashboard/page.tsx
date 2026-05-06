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
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  const sevenAgo = new Date(now); sevenAgo.setDate(sevenAgo.getDate() - 6); sevenAgo.setHours(0, 0, 0, 0);

  const [todayCount, revenueAgg, pendingCount, deliveredToday, recent, lastFive, pendingUsers] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: todayStart, lte: todayEnd }, status: { in: ["aprobado", "enviado", "entregado"] } },
    }),
    prisma.order.count({ where: { status: "pendiente" } }),
    prisma.order.count({ where: { status: "entregado", updatedAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.order.findMany({ where: { createdAt: { gte: sevenAgo } }, select: { createdAt: true, total: true } }),
    prisma.order.findMany({
      take: 5, orderBy: { createdAt: "desc" },
      select: { id: true, guestName: true, guestEmail: true, total: true, status: true, createdAt: true, user: { select: { name: true, email: true } } },
    }),
    prisma.user.count({ where: { status: "pending" } }),
  ]);

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const dayOrders = recent.filter((o) => o.createdAt.toISOString().slice(0, 10) === dateStr);
    return { date: dateStr, label: d.toLocaleDateString("es-AR", { weekday: "short" }), count: dayOrders.length, revenue: dayOrders.reduce((s, o) => s + o.total, 0) };
  });

  return { todayCount, revenue: revenueAgg._sum.total ?? 0, pendingCount, deliveredToday, chartData, lastFive, pendingUsers };
}

export default async function DashboardPage() {
  const { todayCount, revenue, pendingCount, deliveredToday, chartData, lastFive, pendingUsers } = await getStats();
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
