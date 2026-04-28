import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, tokenCookieOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email y contraseña son requeridos", code: "MISSING_FIELDS" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { error: "Credenciales incorrectas", code: "INVALID_CREDENTIALS" },
      { status: 401 }
    );
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json(
      { error: "Credenciales incorrectas", code: "INVALID_CREDENTIALS" },
      { status: 401 }
    );
  }

  const token = await signToken({ userId: user.id, email: user.email, role: user.role });
  const res = NextResponse.json({
    success: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
  res.cookies.set(tokenCookieOptions(token));
  return res;
}
