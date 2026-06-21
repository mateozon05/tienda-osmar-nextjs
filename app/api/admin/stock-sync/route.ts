import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

interface StockRow {
  code: string;
  name: string;
  newStock: number;
}

interface SyncResult {
  code: string;
  name: string;
  oldStock: number | null;
  newStock: number;
  status: "updated" | "unchanged" | "not_found";
}

// Separado para que un cron futuro pueda llamarlo directamente
// pasando un Buffer leído desde disco o S3.
export function parseStockExcel(buffer: Buffer): StockRow[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

  const headerRowIndex = rows.findIndex((row) =>
    (row as unknown[]).some(
      (cell) => String(cell).trim() === "Codigo de Producto"
    )
  );

  if (headerRowIndex === -1) {
    throw new Error(
      'No se encontró la fila de headers. Verificá que el Excel sea una exportación de "Stock de Artículos" de SIPE.'
    );
  }

  const headers = rows[headerRowIndex] as string[];
  const colCode  = headers.findIndex((h) => String(h).trim() === "Codigo de Producto");
  const colName  = headers.findIndex((h) => String(h).trim() === "Nombre de Producto");
  const colStock = headers.findIndex((h) => String(h).trim() === "Stock Total");

  if (colCode === -1 || colStock === -1) {
    throw new Error(
      'No se encontraron las columnas "Codigo de Producto" y/o "Stock Total" en el Excel.'
    );
  }

  const dataRows = rows.slice(headerRowIndex + 1) as unknown[][];

  return dataRows
    .filter((row) => row[colCode] !== undefined && row[colCode] !== "")
    .map((row) => ({
      code:     String(row[colCode]).trim(),
      name:     String(row[colName] ?? "").trim(),
      newStock: parseInt(String(row[colStock] ?? "0")) || 0,
    }));
}

// Separado para que sea reutilizable desde un cron sin tocar la lógica.
export async function applyStockSync(
  stockRows: StockRow[],
  dryRun: boolean
): Promise<{ results: SyncResult[]; summary: Record<string, number> }> {
  const products = await prisma.product.findMany({
    select: { id: true, code: true, name: true, stock: true },
  });
  const byCode = new Map(products.map((p) => [p.code, p]));

  const results: SyncResult[] = [];
  const updates: { id: number; stock: number }[] = [];

  for (const row of stockRows) {
    const product = byCode.get(row.code);

    if (!product) {
      results.push({ code: row.code, name: row.name, oldStock: null, newStock: row.newStock, status: "not_found" });
      continue;
    }

    if (product.stock === row.newStock) {
      results.push({ code: row.code, name: product.name, oldStock: product.stock, newStock: row.newStock, status: "unchanged" });
      continue;
    }

    results.push({ code: row.code, name: product.name, oldStock: product.stock, newStock: row.newStock, status: "updated" });
    updates.push({ id: product.id, stock: row.newStock });
  }

  if (!dryRun && updates.length > 0) {
    await prisma.$transaction(
      updates.map((u) =>
        prisma.product.update({ where: { id: u.id }, data: { stock: u.stock } })
      )
    );
  }

  const summary = {
    total:     stockRows.length,
    updated:   results.filter((r) => r.status === "updated").length,
    unchanged: results.filter((r) => r.status === "unchanged").length,
    notFound:  results.filter((r) => r.status === "not_found").length,
  };

  return { results, summary };
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file   = formData.get("file") as File | null;
    const dryRun = formData.get("dryRun") === "true";

    if (!file) {
      return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
    }

    const buffer    = Buffer.from(await file.arrayBuffer());
    const stockRows = parseStockExcel(buffer);
    const { results, summary } = await applyStockSync(stockRows, dryRun);

    if (!dryRun) {
      await audit({
        action:   "STOCK_SYNC",
        entity:   "Product",
        userId:   session.userId,
        userName: session.email,
        details:  summary,
      });
    }

    return NextResponse.json({ success: true, dryRun, summary, results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al procesar el archivo";
    console.error("[stock-sync]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
