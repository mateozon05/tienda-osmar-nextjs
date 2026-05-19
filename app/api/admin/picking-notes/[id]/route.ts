import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) return null;
  return session;
}

const INCLUDE = {
  items:       { include: { product: { select: { id: true, name: true, code: true, imageUrl: true } } } },
  user:        { select: { name: true, clientCode: true, company: true } },
  salesperson: { select: { name: true } },
  order:       { select: { id: true, sipeNumber: true } },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const note = await prisma.pickingNote.findUnique({
    where: { id: parseInt(id) },
    include: INCLUDE,
  });

  if (!note) return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 });
  return NextResponse.json({ note });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const noteId = parseInt(id);
  const body   = await req.json();

  // ── Confirmar (firma del depósito) ─────────────────────────────
  if (body.action === "confirm") {
    if (!body.confirmedBy?.trim()) {
      return NextResponse.json({ error: "El nombre del empleado es obligatorio" }, { status: 400 });
    }
    const note = await prisma.pickingNote.update({
      where: { id: noteId },
      data:  {
        status:         "confirmed",
        confirmedAt:    new Date(),
        confirmedBy:    body.confirmedBy.trim(),
        confirmedNotes: body.confirmedNotes ?? null,
      },
      include: INCLUDE,
    });
    return NextResponse.json({ note });
  }

  // ── Registrar impresión ────────────────────────────────────────
  if (body.action === "print") {
    const note = await prisma.pickingNote.update({
      where: { id: noteId },
      data:  { printedAt: new Date(), printCount: { increment: 1 } },
      include: INCLUDE,
    });
    return NextResponse.json({ note });
  }

  // ── Cambio de estado (preparing / cancelled / pending) ─────────
  if (body.status) {
    const note = await prisma.pickingNote.update({
      where: { id: noteId },
      data:  { status: body.status },
      include: INCLUDE,
    });
    return NextResponse.json({ note });
  }

  // ── Actualizar cantidades preparadas por item ──────────────────
  if (body.pickedItems) {
    await Promise.all(
      (body.pickedItems as { id: number; pickedQuantity: number; notes?: string }[]).map((pi) =>
        prisma.pickingNoteItem.update({
          where: { id: pi.id },
          data:  { pickedQuantity: pi.pickedQuantity, notes: pi.notes ?? null },
        })
      )
    );
    const note = await prisma.pickingNote.findUnique({ where: { id: noteId }, include: INCLUDE });
    return NextResponse.json({ note });
  }

  return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
}
