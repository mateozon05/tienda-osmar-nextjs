import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) return null;
  return session;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const noteId = parseInt(id);

  const note = await prisma.pickingNote.findUnique({
    where: { id: noteId },
    include: {
      items: true,
      user:  true,
    },
  });

  if (!note) {
    return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 });
  }
  if (note.status !== "confirmed") {
    return NextResponse.json(
      { error: "Solo se puede convertir una nota confirmada a Orden de Venta" },
      { status: 400 }
    );
  }
  if (note.orderId) {
    return NextResponse.json(
      { error: "Esta nota ya fue convertida a una Orden de Venta" },
      { status: 400 }
    );
  }
  if (!note.items.length) {
    return NextResponse.json({ error: "La nota no tiene ítems" }, { status: 400 });
  }

  const itemsWithProduct = note.items.filter((i) => i.productId !== null);
  if (!itemsWithProduct.length) {
    return NextResponse.json({ error: "Ningún ítem tiene un producto válido para crear la orden" }, { status: 400 });
  }

  // Create the Orden de Venta
  const order = await prisma.order.create({
    data: {
      userId:          note.userId      ?? null,
      clientCode:      note.clientCode  ?? null,
      clientName:      note.clientName  ?? null,
      salespersonId:   note.salespersonId   ?? null,
      salespersonName: note.salespersonName ?? null,
      subtotal:        note.subtotal,
      tax:             note.tax,
      total:           note.total,
      totalWithTax:    note.total,
      notes:           note.notes ?? null,
      status:          "procesando",
      orderType:       "order",
      paymentMethod:   "efectivo",
      shippingMethod:  "retiro",
      items: {
        create: itemsWithProduct.map((item) => ({
          productId: item.productId!,
          quantity:  item.pickedQuantity ?? item.quantity,
          unitPrice: item.unitPrice,
        })),
      },
    },
    include: {
      items:       { include: { product: { select: { id: true, name: true, code: true } } } },
      salesperson: { select: { name: true } },
      user:        { select: { name: true, company: true } },
    },
  });

  // Link picking note → order
  const updatedNote = await prisma.pickingNote.update({
    where: { id: noteId },
    data:  { orderId: order.id },
    include: {
      items:       { include: { product: { select: { id: true, name: true, code: true, imageUrl: true } } } },
      user:        { select: { name: true, clientCode: true, company: true } },
      salesperson: { select: { name: true } },
      order:       { select: { id: true, sipeNumber: true } },
    },
  });

  return NextResponse.json({ order, note: updatedNote }, { status: 201 });
}
