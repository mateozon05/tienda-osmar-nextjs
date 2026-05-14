import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) return null;
  return session;
}

// GET /api/admin/salespersons/[id]/clients
// Returns clients linked to this salesperson
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const links = await prisma.clientSalesperson.findMany({
    where: { salespersonId: Number(id) },
    include: {
      client: {
        select: {
          id: true, clientCode: true, name: true, company: true,
          email: true, city: true, phone: true,
          _count: { select: { orders: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ clients: links });
}

// POST /api/admin/salespersons/[id]/clients
// Body: { clientId, commission? }  → assign client to salesperson
// Body: { clientId, action: "remove" } → unlink
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const salespersonId = Number(id);
  const body = await req.json();
  const { clientId, commission, action } = body;

  if (!clientId) {
    return NextResponse.json({ error: "clientId requerido" }, { status: 400 });
  }

  if (action === "remove") {
    await prisma.clientSalesperson.deleteMany({
      where: { salespersonId, clientId: Number(clientId) },
    });
    // Also clear salespersonId on user if it points to this salesperson
    await prisma.user.updateMany({
      where: { id: Number(clientId), salespersonId },
      data:  { salespersonId: null },
    });
    return NextResponse.json({ ok: true });
  }

  // Upsert the link
  const link = await prisma.clientSalesperson.upsert({
    where: {
      salespersonId_clientId: { salespersonId, clientId: Number(clientId) },
    },
    create: {
      salespersonId,
      clientId:   Number(clientId),
      commission: commission != null ? Number(commission) : null,
    },
    update: {
      commission: commission != null ? Number(commission) : null,
    },
  });

  // Also set salespersonId on User for quick lookup
  await prisma.user.update({
    where: { id: Number(clientId) },
    data:  { salespersonId },
  });

  return NextResponse.json({ link }, { status: 201 });
}
