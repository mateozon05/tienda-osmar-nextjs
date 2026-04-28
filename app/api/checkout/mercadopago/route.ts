import { NextRequest, NextResponse } from "next/server";
import { preferenceClient } from "@/lib/mp";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { orderId } = await req.json();

  if (!orderId) {
    return NextResponse.json({ error: "orderId requerido", code: "MISSING_ORDER" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: Number(orderId) },
    include: { items: { include: { product: true } } },
  });

  if (!order) {
    return NextResponse.json({ error: "Orden no encontrada", code: "ORDER_NOT_FOUND" }, { status: 404 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

  let preference;
  try {
    preference = await preferenceClient.create({
      body: {
        items: order.items.map((item) => ({
          id: item.productId.toString(),
          title: item.product.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          currency_id: "ARS",
        })),
        payer: {
          email: order.guestEmail ?? undefined,
          name: order.guestName ?? undefined,
          phone: order.guestPhone ? { number: order.guestPhone } : undefined,
        },
        back_urls: {
          success: `${siteUrl}/checkout/success?order_id=${orderId}`,
          failure: `${siteUrl}/checkout/failure?order_id=${orderId}`,
          pending: `${siteUrl}/checkout/pending?order_id=${orderId}`,
        },
        // auto_return: solo en producción con URL pública
        ...(siteUrl.startsWith("https") && { auto_return: "approved" }),
        notification_url: `${siteUrl}/api/checkout/mercadopago/webhook`,
        external_reference: orderId.toString(),
        statement_descriptor: "DIST OSMAR",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error de Mercado Pago";
    console.error("MP preference error:", msg);
    return NextResponse.json(
      {
        error: "No se pudo conectar con Mercado Pago. Verificá las credenciales en .env.local",
        code: "MP_ERROR",
        detail: msg,
      },
      { status: 502 }
    );
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { mpPaymentId: preference.id ?? null },
  });

  return NextResponse.json({
    preferenceId: preference.id,
    initPoint: preference.init_point,
    sandboxInitPoint: preference.sandbox_init_point,
  });
}
