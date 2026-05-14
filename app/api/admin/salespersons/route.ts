import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    return null;
  }
  return session;
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q      = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status") ?? "";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { name:  { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }

  const salespersons = await prisma.salesperson.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { clientLinks: true, orders: true },
      },
    },
  });

  return NextResponse.json({ salespersons });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, phone, defaultCommission } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
  }

  const salesperson = await prisma.salesperson.create({
    data: {
      name:              name.trim(),
      email:             email?.trim() || null,
      phone:             phone?.trim() || null,
      defaultCommission: Number(defaultCommission ?? 5),
    },
  });

  return NextResponse.json({ salesperson }, { status: 201 });
}
