import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, tokenCookieOptions } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Rate limiting: 5 intentos por IP por minuto
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";

  const { allowed } = checkRateLimit(`login:${ip}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Esperá un minuto e intentá de nuevo.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  // Accept both old `email` field and new `identifier` (email OR clientCode)
  const body = await req.json();
  const identifier: string = (body.identifier ?? body.email ?? "").trim();
  const password: string   = body.password ?? "";

  if (!identifier || !password) {
    return NextResponse.json(
      { error: "Completá todos los campos", code: "MISSING_FIELDS" },
      { status: 400 }
    );
  }

  // Find by email OR clientCode
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier },
        { clientCode: identifier },
      ],
    },
  });
  if (!user) {
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos", code: "INVALID_CREDENTIALS" },
      { status: 401 }
    );
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos", code: "INVALID_CREDENTIALS" },
      { status: 401 }
    );
  }

  // Block pending accounts
  if (user.status === "pending") {
    return NextResponse.json(
      { error: "Tu cuenta está pendiente de aprobación. Te avisaremos cuando esté activa.", code: "ACCOUNT_PENDING" },
      { status: 403 }
    );
  }

  // Block rejected accounts
  if (user.status === "rejected") {
    return NextResponse.json(
      { error: "Tu cuenta no fue aprobada. Contactá a ventas@distribuidoraosmar.com", code: "ACCOUNT_REJECTED" },
      { status: 403 }
    );
  }

  // Block inactive accounts (deactivated by superadmin)
  if (user.status === "inactive") {
    return NextResponse.json(
      { error: "Tu cuenta ha sido desactivada. Contactá al administrador.", code: "ACCOUNT_INACTIVE" },
      { status: 403 }
    );
  }

  // Record last login (fire-and-forget, don't block response)
  prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } }).catch(() => {});

  const token = await signToken({
    userId: user.id,
    email:  user.email ?? user.clientCode ?? "",
    role:   user.role,
  });
  const res = NextResponse.json({
    success: true,
    user: {
      id: user.id, email: user.email, clientCode: user.clientCode,
      name: user.name, role: user.role, status: user.status, company: user.company,
    },
  });
  res.cookies.set(tokenCookieOptions(token));

  await audit({
    action:    "LOGIN",
    entity:    "User",
    entityId:  user.id,
    userId:    user.id,
    userName:  user.name,
    ip:        req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown",
    userAgent: req.headers.get("user-agent") ?? "unknown",
  });

  return res;
}
