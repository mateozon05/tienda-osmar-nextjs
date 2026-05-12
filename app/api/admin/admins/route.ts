import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — listar todos los admins/superadmins
export async function GET() {
  const session = await getSession();
  if (session?.role !== "superadmin") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const admins = await prisma.user.findMany({
    where: { role: { in: ["admin", "superadmin"] } },
    select: {
      id: true, name: true, email: true,
      role: true, status: true,
      lastLogin: true, createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ admins });
}

// POST — crear nuevo admin
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "superadmin") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { name, email, password, role } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Este email ya está registrado" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: role === "superadmin" ? "superadmin" : "admin",
      status: "approved",
    },
    select: {
      id: true, name: true, email: true,
      role: true, status: true,
      lastLogin: true, createdAt: true,
    },
  });

  return NextResponse.json({ success: true, admin }, { status: 201 });
}
