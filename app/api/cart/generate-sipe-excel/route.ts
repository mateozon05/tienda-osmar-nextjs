import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type CartItemPayload = {
  productId: number;
  code: string;
  name: string;
  quantity: number;
  price: number;
  purchaseType?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: CartItemPayload[] = body.items ?? [];

    if (items.length === 0) {
      return NextResponse.json({ error: "El carrito está vacío" }, { status: 400 });
    }

    // ── Datos del cliente (opcional — funciona también sin sesión) ────────────
    let clientCode = "";
    let clientName = "Cliente sin cuenta";

    const session = await getSession();
    if (session) {
      const user = await prisma.user.findUnique({
        where:  { id: session.userId },
        select: { clientCode: true, name: true, company: true },
      });
      if (user) {
        clientCode = user.clientCode ?? "";
        clientName = user.company ?? user.name ?? "Cliente sin cuenta";
      }
    }

    // ── Obtener barcodes desde la BD ─────────────────────────────────────────
    const productIds = items.map((i) => i.productId).filter(Boolean);
    const products   = await prisma.product.findMany({
      where:  { id: { in: productIds } },
      select: { id: true, barcode: true },
    });
    const barcodeMap = Object.fromEntries(products.map((p) => [p.id, p.barcode ?? ""]));

    // ── Construir el Excel con el formato exacto de SIPE ─────────────────────
    //
    // Estructura:
    //   Fila 1: "Código Cliente:"  | <código>
    //   Fila 2: "Razón Social:"    | <nombre>
    //   Fila 3: (vacía)
    //   Fila 4: headers de columnas
    //   Fila 5+: un ítem por fila
    //
    const rows: (string | number)[][] = [
      ["Código Cliente:", clientCode, "", "", "", ""],
      ["Razón Social:",   clientName, "", "", "", ""],
      ["",                "",         "", "", "", ""],
      ["Código Producto", "Código de Barras", "Descripción", "Cantidad", "Precio", "Total"],
    ];

    for (const item of items) {
      const qty      = Number(item.quantity) || 1;
      const price    = Number(item.price)    || 0;
      const total    = qty * price;
      const barcode  = barcodeMap[item.productId] ?? "";

      rows.push([
        item.code  ?? "",
        barcode,
        item.name  ?? "",
        qty,
        price,
        total,
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Ancho de columnas
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

    const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    const date   = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const filename = `pedido-osmar-${date}.xlsx`;

    return NextResponse.json({
      success:    true,
      excel:      base64,
      filename,
      clientCode,
      clientName,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[generate-sipe-excel] ERROR:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
