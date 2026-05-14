import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) return null;
  return session;
}

// GET /api/admin/salespersons/[id]/commission?from=YYYY-MM-DD&to=YYYY-MM-DD&status=
// Returns order summary and commission totals for a period
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const salespersonId = Number(id);
  const { searchParams } = new URL(req.url);

  const from   = searchParams.get("from");
  const to     = searchParams.get("to");
  const status = searchParams.get("status") ?? "";

  const where: Record<string, unknown> = { salespersonId };
  if (status) where.status = status;
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from + "T00:00:00.000Z");
    if (to)   (where.createdAt as Record<string, unknown>).lte = new Date(to   + "T23:59:59.999Z");
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      user: { select: { id: true, clientCode: true, name: true, company: true } },
      items: { include: { product: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalSales      = orders.reduce((s, o) => s + o.total, 0);
  const totalCommission = orders.reduce((s, o) => s + (o.commissionAmount ?? 0), 0);

  // Group by client
  const byClient = new Map<number, { clientCode: string; name: string; company: string | null; sales: number; commission: number; orderCount: number }>();
  for (const o of orders) {
    if (!o.userId || !o.user) continue;
    const existing = byClient.get(o.userId);
    if (existing) {
      existing.sales      += o.total;
      existing.commission += o.commissionAmount ?? 0;
      existing.orderCount += 1;
    } else {
      byClient.set(o.userId, {
        clientCode:  o.user.clientCode ?? "",
        name:        o.user.name,
        company:     o.user.company,
        sales:       o.total,
        commission:  o.commissionAmount ?? 0,
        orderCount:  1,
      });
    }
  }

  return NextResponse.json({
    salespersonId,
    period: { from, to },
    summary: {
      orderCount:      orders.length,
      totalSales,
      totalCommission,
    },
    byClient:  Array.from(byClient.values()).sort((a, b) => b.sales - a.sales),
    orders:    orders.map((o) => ({
      id:               o.id,
      createdAt:        o.createdAt,
      status:           o.status,
      total:            o.total,
      commissionRate:   o.commissionRate,
      commissionAmount: o.commissionAmount,
      clientCode:       o.user?.clientCode ?? null,
      clientName:       o.user?.name       ?? o.guestName ?? "Invitado",
    })),
  });
}
