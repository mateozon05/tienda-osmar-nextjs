import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { paymentClient } from "@/lib/mp";
import { prisma } from "@/lib/prisma";

const MP_TO_INTERNAL: Record<string, string> = {
  approved:   "aprobado",
  pending:    "pendiente",
  in_process: "en_proceso",
  rejected:   "rechazado",
  cancelled:  "cancelado",
  refunded:   "reembolsado",
};

function verifyMPSignature(req: NextRequest, bodyText: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return false;

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");
  if (!xSignature || !xRequestId) return false;

  // Parsear ts y v1 del header x-signature: "ts=...,v1=..."
  const parts = Object.fromEntries(
    xSignature.split(",").map(p => p.split("=").map(s => s.trim()) as [string, string])
  );
  const ts   = parts["ts"];
  const hash = parts["v1"];
  if (!ts || !hash) return false;

  // data.id viene en query param o en el body
  const dataId =
    new URL(req.url).searchParams.get("data.id") ??
    (() => { try { return JSON.parse(bodyText)?.data?.id?.toString(); } catch { return null; } })();

  if (!dataId) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const computed  = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
}

export async function POST(req: NextRequest) {
  // Si no hay secret configurado, rechazar todo hasta que se configure
  if (!process.env.MP_WEBHOOK_SECRET) {
    console.error("[mp-webhook] MP_WEBHOOK_SECRET no configurado — rechazando");
    return NextResponse.json({ error: "No configurado" }, { status: 503 });
  }

  const bodyText = await req.text();

  if (!verifyMPSignature(req, bodyText)) {
    console.warn("[mp-webhook] Firma inválida o faltante — rechazando");
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  try {
    const body = JSON.parse(bodyText);

    // MP envía merchant_order y payment — solo procesar pagos
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
        mpStatus:    payment.status ?? null,
        mpPaymentId: paymentId.toString(),
        status:      MP_TO_INTERNAL[payment.status ?? ""] ?? "pendiente",
      },
    });
  } catch (err) {
    console.error("[mp-webhook] Error procesando pago:", err);
  }

  // Siempre 200 para que MP no reintente
  return NextResponse.json({ received: true });
}
