import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) return null;
  return session;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const salesperson = await prisma.salesperson.findUnique({
    where: { id: Number(id) },
    include: {
      clientLinks: {
        include: {
          client: {
            select: { id: true, clientCode: true, name: true, company: true, email: true, city: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { orders: true } },
    },
  });

  if (!salesperson) {
    return NextResponse.json({ error: "Vendedor no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ salesperson });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.name !== undefined)               data.name = body.name.trim();
  if (body.email !== undefined)              data.email = body.email?.trim() || null;
  if (body.phone !== undefined)              data.phone = body.phone?.trim() || null;
  if (body.defaultCommission !== undefined)  data.defaultCommission = Number(body.defaultCommission);
  if (body.status !== undefined)             data.status = body.status;

  const salesperson = await prisma.salesperson.update({
    where: { id: Number(id) },
    data,
  });

  return NextResponse.json({ salesperson });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "superadmin") {
    return NextResponse.json({ error: "Solo superadmin puede eliminar vendedores" }, { status: 403 });
  }

  const { id } = await params;

  // Unlink clients before delete
  await prisma.user.updateMany({
    where: { salespersonId: Number(id) },
    data:  { salespersonId: null },
  });

  await prisma.salesperson.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
