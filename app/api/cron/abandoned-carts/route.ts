import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const SHOP_URL = process.env.NEXT_PUBLIC_URL ?? "https://tienda-osmar-nextjs.vercel.app";

export async function GET(req: NextRequest) {
  // Auth: Bearer token que solo conoce Vercel Cron
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from   = process.env.RESEND_FROM ?? "onboarding@resend.dev";

  // Carritos abandonados: actualizados hace más de 5 min, sin convertir y sin recordatorio enviado
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const carts = await prisma.cart.findMany({
    where: {
      updatedAt:      { lt: fiveMinutesAgo },
      convertedAt:    null,
      reminderSentAt: null,
      items:          { some: {} },
    },
    include: {
      user:  { select: { name: true, email: true, company: true } },
      items: {
        include: {
          product: { select: { name: true, code: true } },
        },
      },
    },
  });

  let sent   = 0;
  let errors = 0;

  for (const cart of carts) {
    if (!cart.user?.email) continue;

    try {
      const total      = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
      const clientName = cart.user.company ?? cart.user.name ?? "Cliente";

      const itemsHtml = cart.items
        .map(
          (item) => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;font-family:monospace;font-size:13px;">
              ${item.product?.code ?? "—"}
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;">
              ${item.product?.name ?? "Producto"}
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-size:14px;">
              ${item.quantity} ${item.type}
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-size:14px;font-weight:600;">
              $${(item.price * item.quantity).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </td>
          </tr>`
        )
        .join("");

      await resend.emails.send({
        from,
        to:      cart.user.email,
        subject: "🛒 Tenés productos esperándote en Distribuidora Osmar",
        html: `<!DOCTYPE html>
<html lang="es">
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9;">

  <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,.08);">

    <div style="text-align:center;margin-bottom:28px;">
      <h1 style="color:#FF751F;margin:0 0 4px;font-size:24px;">Distribuidora Osmar</h1>
      <p style="color:#888;margin:0;font-size:13px;">Productos de limpieza mayorista · Tigre, Bs. As.</p>
    </div>

    <h2 style="color:#1A1A2E;margin:0 0 12px;">Hola ${clientName} 👋</h2>
    <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Dejaste algunos productos en tu carrito y todavía están disponibles para vos.
    </p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <thead>
        <tr style="background:#1A1A2E;color:white;">
          <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Código</th>
          <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Producto</th>
          <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Cant.</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Subtotal</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
      <tfoot>
        <tr style="background:#FF751F;color:white;">
          <td colspan="3" style="padding:12px;font-weight:700;font-size:15px;">TOTAL ESTIMADO</td>
          <td style="padding:12px;text-align:right;font-weight:800;font-size:17px;">
            $${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
          </td>
        </tr>
      </tfoot>
    </table>

    <div style="text-align:center;margin:28px 0;">
      <a
        href="${SHOP_URL}"
        style="background:#25D366;color:white;padding:14px 32px;text-decoration:none;
               border-radius:10px;font-weight:700;font-size:16px;display:inline-block;"
      >
        Completar mi pedido por WhatsApp 💬
      </a>
    </div>

    <p style="color:#aaa;font-size:12px;text-align:center;margin:24px 0 0;">
      Distribuidora Osmar · Av. Cazón 464, Tigre · +54 9 11 5017-9447
    </p>

  </div>
</body>
</html>`,
      });

      await prisma.cart.update({
        where: { id: cart.id },
        data:  { reminderSentAt: new Date() },
      });

      sent++;
    } catch (err: unknown) {
      errors++;
      console.error(
        `[cron/abandoned-carts] Error enviando a ${cart.user.email}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  console.log(`[cron/abandoned-carts] checked=${carts.length} sent=${sent} errors=${errors}`);
  return NextResponse.json({ ok: true, checked: carts.length, sent, errors });
}
