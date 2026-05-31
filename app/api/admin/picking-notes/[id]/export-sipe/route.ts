import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const noteId  = parseInt(id);

  const note = await prisma.pickingNote.findUnique({
    where:   { id: noteId },
    include: {
      items: {
        include: {
          product: { select: { code: true, name: true, barcode: true } },
        },
      },
    },
  });

  if (!note) {
    return NextResponse.json({ error: "Nota no encontrada" }, { status: 404 });
  }

  // ── Formato exacto SIPE ────────────────────────────────────────────────
  const rows: (string | number)[][] = [
    ["Código Cliente:", note.clientCode ?? "", "", "", "", ""],
    ["Razón Social:",   note.clientName  ?? "", "", "", "", ""],
    ["",                "",               "", "", "", ""],
    ["Código Producto", "Código de Barras", "Descripción", "Cantidad", "Precio", "Total"],
  ];

  for (const item of note.items) {
    const code    = item.productCode ?? item.product?.code ?? "";
    const barcode = item.product?.barcode ?? "";
    const name    = item.productName ?? item.product?.name ?? "";
    const qty     = item.pickedQuantity ?? item.quantity;
    const price   = item.unitPrice;

    rows.push([code, barcode, name, qty, price, qty * price]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [
    { wch: 18 }, // Código Producto
    { wch: 18 }, // Código de Barras
    { wch: 50 }, // Descripción
    { wch: 12 }, // Cantidad
    { wch: 14 }, // Precio
    { wch: 14 }, // Total
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pedido");

  const base64   = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  const filename = `${note.number}-SIPE.xlsx`;

  return NextResponse.json({ success: true, excel: base64, filename });
}
