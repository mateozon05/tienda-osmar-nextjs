import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [
    todayOrders,
    todayRevenue,
    pendingCount,
    deliveredToday,
    recentOrders,
    lastFive,
  ] = await Promise.all([
    // Órdenes de hoy
    prisma.order.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),

    // Ingresos de hoy (solo órdenes aprobadas)
    prisma.order.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: todayStart, lte: todayEnd }, status: { in: ["aprobado", "enviado", "entregado"] } },
    }),

    // Órdenes pendientes totales
    prisma.order.count({ where: { status: "pendiente" } }),

    // Entregadas hoy
    prisma.order.count({ where: { status: "entregado", updatedAt: { gte: todayStart, lte: todayEnd } } }),

    // Órdenes últimos 7 días para el gráfico
    prisma.order.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, total: true, status: true },
    }),

    // Últimas 5 órdenes
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        guestName: true,
        guestEmail: true,
        total: true,
        status: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  // Construir datos del gráfico (últimos 7 días)
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const dayOrders = recentOrders.filter(
      (o) => o.createdAt.toISOString().slice(0, 10) === dateStr
    );
    return {
      date: dateStr,
      label: d.toLocaleDateString("es-AR", { weekday: "short" }),
      count: dayOrders.length,
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
    };
  });

  return NextResponse.json({
    today: {
      orders: todayOrders,
      revenue: todayRevenue._sum.total ?? 0,
      pending: pendingCount,
      delivered: deliveredToday,
    },
    chart: chartData,
    lastFive,
  });
}
