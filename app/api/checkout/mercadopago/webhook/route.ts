import { NextRequest, NextResponse } from "next/server";
import { paymentClient } from "@/lib/mp";
import { prisma } from "@/lib/prisma";

const MP_TO_INTERNAL: Record<string, string> = {
  approved: "aprobado",
  pending: "pendiente",
  in_process: "en_proceso",
  rejected: "rechazado",
  cancelled: "cancelado",
  refunded: "reembolsado",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // MP sends merchant_order and payment notifications — only handle payments
    if (body.type !== "payment") {
      return NextResponse.json({ received: true });
    }

    const paymentId = body.data?.id;
    if (!paymentId) return NextResponse.json({ received: true });

    const payment = await paymentClient.get({ id: paymentId });
    const orderId = parseInt(payment.external_reference ?? "0");
    if (!orderId) return NextResponse.json({ received: true });

    await prisma.order.update({
      where: { id: orderId },
      data: {
        mpStatus: payment.status ?? null,
        mpPaymentId: paymentId.toString(),
        status: MP_TO_INTERNAL[payment.status ?? ""] ?? "pendiente",
      },
    });
  } catch (err) {
    console.error("Webhook error:", err);
  }

  // Always return 200 so MP doesn't retry
  return NextResponse.json({ received: true });
}
