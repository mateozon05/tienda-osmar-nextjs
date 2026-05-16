import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function requireAdmin() {
  const s = await getSession();
  if (!s || (s.role !== "admin" && s.role !== "superadmin")) return null;
  return s;
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q             = searchParams.get("q")?.trim()       ?? "";
  const from          = searchParams.get("from")            ?? "";
  const to            = searchParams.get("to")              ?? "";
  const salespersonId = searchParams.get("salespersonId")   ?? "";
  const orderType     = searchParams.get("orderType")       ?? "";
  const status        = searchParams.get("status")          ?? "";
  const page          = parseInt(searchParams.get("page")   ?? "1");
  const limit         = parseInt(searchParams.get("limit")  ?? "50");
  const exportXlsx    = searchParams.get("export")          === "1";

  const where: Record<string, unknown> = {
    importedFromSipe: true,
  };

  if (orderType)     where.orderType     = orderType;
  if (status)        where.status        = status;
  if (salespersonId) where.salespersonId = parseInt(salespersonId);

  if (from || to) {
    where.orderDate = {};
    if (from) (where.orderDate as Record<string, unknown>).gte = new Date(from + "T00:00:00.000Z");
    if (to)   (where.orderDate as Record<string, unknown>).lte = new Date(to   + "T23:59:59.999Z");
  }

  if (q) {
    where.OR = [
      { clientName:  { contains: q, mode: "insensitive" } },
      { clientCode:  { contains: q, mode: "insensitive" } },
      { sipeNumber:  { contains: q, mode: "insensitive" } },
      { invoiceNumber: { contains: q, mode: "insensitive" } },
      { salespersonName: { contains: q, mode: "insensitive" } },
    ];
  }

  const [orders, total, aggResult] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { orderDate: "desc" },
      skip:    exportXlsx ? 0 : (page - 1) * limit,
      take:    exportXlsx ? undefined : limit,
      select: {
        id: true, sipeId: true, sipeNumber: true,
        orderType: true, status: true,
        clientCode: true, clientName: true,
        salespersonId: true, salespersonName: true,
        invoiceNumber: true, invoiceType: true, invoiceDate: true,
        total: true, subtotal: true, tax: true, totalWithTax: true,
        channel: true, branch: true, orderDate: true,
        user: { select: { id: true, clientCode: true, name: true } },
        salesperson: { select: { id: true, name: true } },
      },
    }),
    prisma.order.count({ where }),
    prisma.order.aggregate({
      where,
      _sum: { total: true, totalWithTax: true, tax: true },
      _count: { id: true },
    }),
  ]);

  if (exportXlsx) {
    // Return raw data for Excel export (handled client-side via this endpoint)
    return NextResponse.json({ orders, total, agg: aggResult._sum });
  }

  return NextResponse.json({
    orders,
    total,
    page,
    limit,
    agg: {
      totalSales:     aggResult._sum.total       ?? 0,
      totalWithTax:   aggResult._sum.totalWithTax ?? 0,
      totalTax:       aggResult._sum.tax          ?? 0,
      count:          aggResult._count.id,
    },
  });
}
