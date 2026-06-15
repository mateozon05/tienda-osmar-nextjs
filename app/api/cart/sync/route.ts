import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// POST — guardar/actualizar carrito en BD (fire-and-forget desde el frontend)
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: true }); // guest — sin persistencia

  const body = await req.json().catch(() => ({}));
  const items: Array<{
    id: number;
    quantity: number;
    price: number;
    purchaseType?: string;
  }> = body.items ?? [];

  if (items.length === 0) {
    // Carrito vaciado — borrar registro
    await prisma.cart.deleteMany({ where: { userId: session.userId } });
    return NextResponse.json({ ok: true });
  }

  const cart = await prisma.cart.upsert({
    where:  { userId: session.userId },
    update: {
      updatedAt:      new Date(),
      reminderSentAt: null, // resetear si el cliente vuelve a modificar el carrito
    },
    create: { userId: session.userId },
  });

  // Reemplazar ítems completos (más simple que diff individual)
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  await prisma.cartItem.createMany({
    data: items.map((item) => ({
      cartId:    cart.id,
      productId: Number(item.id),
      quantity:  Number(item.quantity),
      price:     Number(item.price),
      type:      item.purchaseType ?? "unidad",
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({ ok: true, cartId: cart.id });
}

// DELETE — marcar carrito como convertido en pedido (no enviar email de recuperación)
export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: true });

  await prisma.cart.updateMany({
    where: { userId: session.userId },
    data:  { convertedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
