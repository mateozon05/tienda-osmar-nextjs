import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

// GET — fetch own profile
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true, email: true, clientCode: true, name: true,
      company: true, phone: true, address: true, city: true, taxId: true,
      role: true, status: true, lastLogin: true, createdAt: true,
      priceList: { select: { id: true, name: true, discountPercentage: true } },
      _count: { select: { orders: true } },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ user });
}

// PATCH — update own profile
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ("name"    in body && body.name)    data.name    = body.name;
  if ("company" in body) data.company = body.company || null;
  if ("phone"   in body) data.phone   = body.phone   || null;
  if ("address" in body) data.address = body.address || null;
  if ("city"    in body) data.city    = body.city    || null;

  // Password change
  if (body.newPassword) {
    if (!body.currentPassword) {
      return NextResponse.json({ error: "Ingresá tu contraseña actual" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const valid = await bcrypt.compare(body.currentPassword, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 });
    }
    if (body.newPassword.length < 6) {
      return NextResponse.json({ error: "La nueva contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }
    data.password = await bcrypt.hash(body.newPassword, 10);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No hay cambios" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.userId },
    data,
    select: {
      id: true, email: true, clientCode: true, name: true,
      company: true, phone: true, address: true, city: true,
    },
  });

  return NextResponse.json({ user: updated });
}
