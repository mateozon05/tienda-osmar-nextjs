import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import * as XLSX from "xlsx";

async function requireAdmin() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) return null;
  return session;
}

// GET /api/admin/salespersons/[id]/export?from=&to=&status=
// Returns Excel file with commission report
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

  const salesperson = await prisma.salesperson.findUnique({
    where: { id: salespersonId },
  });
  if (!salesperson) {
    return NextResponse.json({ error: "Vendedor no encontrado" }, { status: 404 });
  }

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
      user: { select: { clientCode: true, name: true, company: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // ── Build Excel ────────────────────────────────────────────
  const wb   = XLSX.utils.book_new();

  // Sheet 1: Detalle de pedidos
  const orderRows = orders.map((o) => ({
    "N° Pedido":       o.id,
    "Fecha":           new Date(o.createdAt).toLocaleDateString("es-AR"),
    "Estado":          o.status,
    "Cód. Cliente":    o.user?.clientCode ?? "",
    "Cliente":         o.user?.name       ?? o.guestName ?? "Invitado",
    "Empresa":         o.user?.company    ?? "",
    "Total Pedido":    o.total,
    "% Comisión":      o.commissionRate   ?? salesperson.defaultCommission,
    "Comisión ($)":    o.commissionAmount ?? (o.total * (salesperson.defaultCommission / 100)),
  }));

  const wsOrders = XLSX.utils.json_to_sheet(orderRows);
  XLSX.utils.book_append_sheet(wb, wsOrders, "Pedidos");

  // Sheet 2: Resumen
  const totalSales      = orders.reduce((s, o) => s + o.total, 0);
  const totalCommission = orders.reduce((s, o) => s + (o.commissionAmount ?? (o.total * salesperson.defaultCommission / 100)), 0);

  const summaryData = [
    ["Vendedor",             salesperson.name],
    ["Email",                salesperson.email ?? "-"],
    ["Período Desde",        from ?? "Todos"],
    ["Período Hasta",        to   ?? "Todos"],
    ["Total Pedidos",        orders.length],
    ["Ventas Totales ($)",   totalSales],
    ["Comisión Total ($)",   totalCommission],
    ["% Comisión Default",   salesperson.defaultCommission],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const periodStr = from && to ? `${from}_${to}` : "todos";
  const filename  = `comisiones_${salesperson.name.replace(/\s+/g, "_")}_${periodStr}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
