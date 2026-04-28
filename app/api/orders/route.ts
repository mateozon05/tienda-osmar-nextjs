import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type CartItem = { productId: number; quantity: number };

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { items, guestEmail, guestName, guestPhone, shippingAddress, shippingCity, shippingMethod, notes } = body;

  if (!items?.length) {
    return NextResponse.json({ error: "El carrito está vacío", code: "EMPTY_CART" }, { status: 400 });
  }
  if (!shippingAddress || !shippingCity) {
    return NextResponse.json({ error: "Dirección requerida", code: "MISSING_ADDRESS" }, { status: 400 });
  }

  // Validate products from DB — never trust client-side prices
  const productIds = items.map((i: CartItem) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true },
  });
  if (products.length !== productIds.length) {
    return NextResponse.json({ error: "Producto no disponible", code: "PRODUCT_UNAVAILABLE" }, { status: 400 });
  }

  const priceMap = new Map(products.map((p) => [p.id, p.price]));
  const total = items.reduce(
    (sum: number, i: CartItem) => sum + (priceMap.get(i.productId) ?? 0) * i.quantity,
    0
  );

  const session = await getSession();

  const order = await prisma.order.create({
    data: {
      userId: session?.userId ?? null,
      guestEmail: session ? null : (guestEmail ?? null),
      guestName: session ? null : (guestName ?? null),
      guestPhone: session ? null : (guestPhone ?? null),
      shippingAddress,
      shippingCity,
      shippingMethod: shippingMethod ?? "envio",
      notes: notes ?? null,
      total,
      status: "pendiente",
      items: {
        create: items.map((i: CartItem) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: priceMap.get(i.productId)!,
        })),
      },
    },
  });

  return NextResponse.json({ orderId: order.id, total: order.total }, { status: 201 });
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const where = session.role === "admin" ? {} : { userId: session.userId };
  const orders = await prisma.order.findMany({
    where,
    include: { items: { include: { product: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ orders });
}
