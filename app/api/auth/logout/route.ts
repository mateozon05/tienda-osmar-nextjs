import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getSession();

  if (session) {
    // Marcar el carrito con reminderSentAt para que el cron no mande
    // email de "carrito abandonado" a alguien que cerró sesión a propósito.
    // Si el usuario vuelve y modifica el carrito, el sync resetea este campo.
    prisma.cart.updateMany({
      where: { userId: session.userId, convertedAt: null },
      data:  { reminderSentAt: new Date() },
    }).catch(() => {});

    await audit({
      action:   "LOGOUT",
      entity:   "User",
      entityId: session.userId,
      userId:   session.userId,
      userName: session.email,
    });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set({ name: "osmar-token", value: "", maxAge: 0, path: "/" });
  return res;
}
