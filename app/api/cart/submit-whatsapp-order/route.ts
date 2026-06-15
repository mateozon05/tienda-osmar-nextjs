import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { notifyNewWhatsAppOrder } from "@/lib/email";

async function generateNoteNumber(): Promise<string> {
  const last = await prisma.pickingNote.findFirst({
    orderBy: { createdAt: "desc" },
    select: { number: true },
  });
  if (!last?.number) return "NP-0001";
  const n = parseInt(last.number.replace("NP-", "")) + 1;
  return `NP-${String(n).padStart(4, "0")}`;
}

interface OrderItem {
  productId?: number | string;
  code?: string;
  name?: string;
  quantity: number | string;
  price: number | string;
  purchaseType?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, delivery, address, paymentMethod } = body as {
      items: OrderItem[];
      delivery: string;
      address?: string;
      paymentMethod: string;
    };

    if (!items?.length) {
      return NextResponse.json({ error: "El carrito está vacío" }, { status: 400 });
    }

    // ── Datos del cliente (opcional — funciona sin sesión) ─────────────────
    let clientCode = "";
    let clientName = "Cliente sin cuenta";
    let userId: number | null = null;

    const session = await getSession();
    if (session) {
      const user = await prisma.user.findUnique({
        where:  { id: session.userId },
        select: { id: true, name: true, company: true, clientCode: true },
      });
      if (user) {
        userId     = user.id;
        clientCode = user.clientCode ?? "";
        clientName = user.company ?? user.name ?? "Sin nombre";
      }
    }

    // ── Totales ────────────────────────────────────────────────────────────
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );

    // ── Notas con info de entrega y pago ──────────────────────────────────
    const deliveryText = delivery === "retiro" ? "Retiro en local" : `Envío a domicilio: ${address}`;
    const notes = [deliveryText, `Pago: ${paymentMethod}`, "Pedido vía WhatsApp"].join(" | ");

    const number = await generateNoteNumber();

    // ── Crear nota + descontar stock en una transacción ────────────────────
    const note = await prisma.$transaction(async (tx) => {
      const created = await tx.pickingNote.create({
        data: {
          number,
          userId,
          clientCode,
          clientName,
          subtotal,
          tax:        0,
          total:      subtotal,
          notes,
          status:     "pending",
          printCount: 0,
          items: {
            create: items.map((item) => ({
              productId:   item.productId ? parseInt(String(item.productId)) : null,
              productCode: item.code      ?? null,
              productName: item.name      ?? "Sin nombre",
              quantity:    parseInt(String(item.quantity)) || 1,
              unitPrice:   Number(item.price)              || 0,
              type:        item.purchaseType               ?? "unidad",
              subtotal:    Number(item.price) * (parseInt(String(item.quantity)) || 1),
            })),
          },
        },
      });

      // Descontar stock de cada ítem con producto válido
      for (const item of items) {
        const pid = item.productId ? parseInt(String(item.productId)) : null;
        const qty = parseInt(String(item.quantity)) || 1;
        if (pid) {
          await tx.product.update({
            where: { id: pid },
            data:  { stock: { decrement: qty } },
          });
        }
      }

      return created;
    });

    console.log(`[submit-whatsapp-order] Nota creada: ${note.number} (id=${note.id}) cliente="${clientName}"`);

    // Marcar carrito persistido como convertido (no enviar email de recuperación)
    if (userId) {
      await prisma.cart.updateMany({
        where: { userId },
        data:  { convertedAt: new Date() },
      });
    }

    // ── Auditoría + notificación al admin (no bloqueante) ──────────────────
    await Promise.all([
      audit({
        action:   "PICKING_NOTE_CREATED",
        entity:   "PickingNote",
        entityId: note.id,
        userId:   userId ?? undefined,
        userName: clientName,
        details:  { number: note.number, total: subtotal, itemCount: items.length, delivery: deliveryText, payment: paymentMethod },
        ip:       req.headers.get("x-forwarded-for") ?? "unknown",
      }),
      notifyNewWhatsAppOrder({
        id:        note.id,
        number:    note.number,
        clientName,
        clientCode,
        total:     subtotal,
        itemCount: items.length,
        delivery:  deliveryText,
        payment:   paymentMethod,
      }),
    ]);

    return NextResponse.json({
      success:    true,
      noteId:     note.id,
      noteNumber: note.number,
      clientCode,
      clientName,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[submit-whatsapp-order] ERROR:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
