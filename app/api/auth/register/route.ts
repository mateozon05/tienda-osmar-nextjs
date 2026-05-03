import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { email, password, name, company } = await req.json();

  if (!email || !password || !name) {
    return NextResponse.json(
      { error: "Email, contraseña y nombre son requeridos", code: "MISSING_FIELDS" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 6 caracteres", code: "WEAK_PASSWORD" },
      { status: 400 }
    );
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json(
      { error: "El email ya está registrado", code: "EMAIL_EXISTS" },
      { status: 409 }
    );
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      name,
      company: company || null,
      status: "pending",   // new users require admin approval
    },
  });

  return NextResponse.json(
    { success: true, userId: user.id, status: "pending" },
    { status: 201 }
  );
}
