/**
 * import-orders-sipe.ts
 * ─────────────────────
 * Importa historial de órdenes de SIPE a la base de datos.
 *
 * Estructura del Excel:
 *   Filas 0-11: header SIPE (info del filtro aplicado)
 *   Fila 12:    vacía
 *   Fila 13:    nombres de columnas
 *   Fila 14:    fila de totales (sin ID, saltar)
 *   Fila 15+:   datos reales
 *
 * Columnas:
 *   ID, Número, Sucursal, Canal de Venta, Caja, P.V., Fecha, Tipo,
 *   Jurisdicción, Código Cliente, Cliente, Factura, Vendedor,
 *   Total Orden de Venta, Neto, IVA, Total C/Iva
 *
 * Uso:
 *   npm run import:orders -- "C:/ruta/exportacion (3).xlsx"
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { Pool } from "pg";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const pool    = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma  = new PrismaClient({ adapter } as never);

// ── Convertir fecha Excel serial a Date ────────────────────────────────────
function excelDateToDate(serial: number): Date {
  // Excel epoch: January 0, 1900. Unix epoch: January 1, 1970.
  // 25569 = Excel serial for 1970-01-01
  // Correct for the Excel leap year bug (1900 is not a leap year)
  const utcMs = (serial - 25569) * 86400 * 1000;
  return new Date(utcMs);
}

// ── Parsear número de factura ──────────────────────────────────────────────
function parseInvoice(raw: string | null): { invoiceNumber: string | null; invoiceType: string | null; invoiceDate: Date | null } {
  if (!raw || raw.trim() === "") {
    return { invoiceNumber: null, invoiceType: null, invoiceDate: null };
  }
  const invoiceNumber = raw.trim();
  // "FC A - 12 - 3344 - 15/05/2026" → type = "A", date = 15/05/2026
  const typeMatch = invoiceNumber.match(/FC\s+([ABC])\s*-/i);
  const dateMatch = invoiceNumber.match(/(\d{2}\/\d{2}\/\d{4})$/);

  let invoiceDate: Date | null = null;
  if (dateMatch) {
    const [d, m, y] = dateMatch[1].split("/").map(Number);
    invoiceDate = new Date(y, m - 1, d);
  }

  return {
    invoiceNumber,
    invoiceType: typeMatch ? typeMatch[1].toUpperCase() : null,
    invoiceDate,
  };
}

async function importOrders(excelPath: string) {
  if (!fs.existsSync(excelPath)) {
    console.error(`❌ Archivo no encontrado: ${excelPath}`);
    process.exit(1);
  }

  console.log(`\n📊 Leyendo Excel de órdenes: ${excelPath}\n`);

  const workbook = XLSX.readFile(excelPath, { cellDates: false });
  const sheet    = workbook.Sheets[workbook.SheetNames[0]];

  // Leer con header numérico para preservar estructura exacta
  const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as (string | number)[][];

  // Fila 13 = columnas, fila 14 = totales (saltar), fila 15+ = datos
  const headers  = allRows[13] as string[];
  const dataRows = allRows.slice(15).filter((r) => r[0] !== "" && r[0] !== undefined);

  console.log(`📋 Columnas: ${headers.join(", ")}`);
  console.log(`📦 ${dataRows.length} órdenes a procesar\n`);

  // ── Mapear índice de columnas ──────────────────────────────────────────
  const COL = {
    id:          headers.indexOf("ID"),
    number:      headers.indexOf("Número"),
    branch:      headers.indexOf("Sucursal"),
    channel:     headers.indexOf("Canal de Venta"),
    date:        headers.indexOf("Fecha"),
    type:        headers.indexOf("Tipo"),
    clientCode:  headers.indexOf("Código Cliente"),
    clientName:  headers.indexOf("Cliente"),
    invoice:     headers.indexOf("Factura"),
    salesperson: headers.indexOf("Vendedor"),
    total:       headers.indexOf("Total Orden de Venta"),
    neto:        headers.indexOf("Neto"),
    iva:         headers.indexOf("IVA"),
    totalConIva: headers.indexOf("Total C/Iva"),
  };

  // ── Cargar catálogos para cruzar IDs ──────────────────────────────────
  console.log("🔍 Cargando catálogos de vendedores y clientes…");

  const [salespersons, clients] = await Promise.all([
    prisma.salesperson.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({
      where:  { role: "customer" },
      select: { id: true, clientCode: true },
    }),
  ]);

  // Map: nombre lowercase → salespersonId
  const spMap = new Map<string, number>();
  for (const sp of salespersons) {
    spMap.set(sp.name.toLowerCase().trim(), sp.id);
    // También por primera palabra (para nombres como "MATEO 7" → "mateo")
    const first = sp.name.split(" ")[0].toLowerCase();
    if (!spMap.has(first)) spMap.set(first, sp.id);
  }

  // Map: clientCode → userId
  const clientMap = new Map<string, number>();
  for (const c of clients) {
    if (c.clientCode) clientMap.set(c.clientCode, c.id);
  }

  function findSalesperson(rawName: string): { id: number | null; name: string | null } {
    const name = rawName?.trim() ?? "";
    if (!name) return { id: null, name: null };
    const lower = name.toLowerCase();

    // Exact match
    if (spMap.has(lower)) return { id: spMap.get(lower)!, name };

    // Partial: the salesperson name starts with the raw name
    for (const [key, id] of spMap) {
      if (lower === key || key.startsWith(lower) || lower.startsWith(key)) {
        return { id, name };
      }
    }
    return { id: null, name };
  }

  console.log(`  ✅ ${salespersons.length} vendedores | ${clients.length} clientes\n`);

  // ── Procesar en lotes de 500 (createMany) ─────────────────────────────
  const BATCH = 500;
  let processed = 0;
  let created   = 0;
  let skipped   = 0;
  const unmatchedSalespersons = new Set<string>();
  const unmatchedClients      = new Set<string>();

  for (let i = 0; i < dataRows.length; i += BATCH) {
    const batch = dataRows.slice(i, i + BATCH);

    const records = batch.map((row) => {
      const sipeId = parseInt(String(row[COL.id]));
      if (isNaN(sipeId)) return null;

      const sipeNumber  = String(row[COL.number] ?? "").trim();
      const clientCode  = String(row[COL.clientCode] ?? "").trim();
      const clientName  = String(row[COL.clientName] ?? "").trim();
      const spRaw       = String(row[COL.salesperson] ?? "").trim();
      const invoiceRaw  = String(row[COL.invoice] ?? "").trim();
      const branch      = String(row[COL.branch] ?? "").trim();
      const channel     = String(row[COL.channel] ?? "").trim();

      // Importes
      const total       = parseFloat(String(row[COL.total]       ?? 0)) || 0;
      const neto        = parseFloat(String(row[COL.neto]        ?? 0)) || 0;
      const iva         = parseFloat(String(row[COL.iva]         ?? 0)) || 0;
      const totalConIva = parseFloat(String(row[COL.totalConIva] ?? 0)) || 0;

      // Fecha
      let orderDate = new Date();
      const dateRaw = row[COL.date];
      if (typeof dateRaw === "number" && dateRaw > 0) {
        orderDate = excelDateToDate(dateRaw);
      }

      // Factura
      const { invoiceNumber, invoiceType, invoiceDate } = parseInvoice(invoiceRaw || null);
      const hasInvoice = invoiceNumber !== null;

      // Vendedor
      const { id: salespersonId, name: salespersonName } = findSalesperson(spRaw);
      if (spRaw && !salespersonId) unmatchedSalespersons.add(spRaw);

      // Cliente
      const userId = clientCode ? clientMap.get(clientCode) ?? null : null;
      if (clientCode && !userId) unmatchedClients.add(clientCode);

      return {
        sipeId,
        sipeNumber,
        orderType:       hasInvoice ? "invoiced" : "order",
        status:          hasInvoice ? "invoiced"  : "delivered",
        userId,
        clientCode:      clientCode || null,
        clientName:      clientName || null,
        salespersonId,
        salespersonName: salespersonName || null,
        invoiceNumber,
        invoiceType,
        invoiceDate,
        total,
        subtotal:        neto,
        tax:             iva,
        totalWithTax:    totalConIva > 0 ? totalConIva : total,
        channel:         channel || null,
        branch:          branch  || null,
        shippingAddress: null,
        shippingCity:    null,
        orderDate,
        importedFromSipe: true,
        paymentMethod:   "efectivo",
      };
    }).filter(Boolean) as object[];

    if (records.length === 0) continue;

    // createMany con skipDuplicates para idempotencia
    const result = await (prisma.order as unknown as { createMany: (arg: { data: object[]; skipDuplicates: boolean }) => Promise<{ count: number }> }).createMany({
      data: records,
      skipDuplicates: true,
    });

    created   += result.count;
    skipped   += records.length - result.count;
    processed += records.length;

    const pct = Math.round((Math.min(i + BATCH, dataRows.length) / dataRows.length) * 100);
    process.stdout.write(`\r  ⏳ ${processed}/${dataRows.length} (${pct}%) — ✅ ${created} creadas, ⏭️ ${skipped} omitidas`);
  }

  // ── Reporte ─────────────────────────────────────────────────────────────
  console.log("\n\n" + "═".repeat(54));
  console.log("📊 REPORTE DE IMPORTACIÓN DE ÓRDENES");
  console.log("═".repeat(54));
  console.log(`  ✅ Creadas:      ${created}`);
  console.log(`  ⏭️  Omitidas:    ${skipped} (ya existían)`);
  console.log(`  📦 Total Excel: ${dataRows.length}`);
  console.log("═".repeat(54));

  if (unmatchedSalespersons.size > 0) {
    console.log(`\n  ⚠️  Vendedores sin match (${unmatchedSalespersons.size}):`);
    for (const s of unmatchedSalespersons) console.log(`     - "${s}"`);
  }
  if (unmatchedClients.size > 0) {
    console.log(`\n  ⚠️  Clientes sin match en BD (${Math.min(unmatchedClients.size, 20)} de ${unmatchedClients.size}):`);
    let count = 0;
    for (const c of unmatchedClients) { if (count++ < 20) console.log(`     - ${c}`); }
  }

  // Guardar reporte JSON
  const reportDir  = path.join(process.cwd(), "outputs");
  const reportPath = path.join(reportDir, "import-orders-report.json");
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    created,
    skipped,
    total: dataRows.length,
    unmatchedSalespersons: [...unmatchedSalespersons],
    unmatchedClients:      [...unmatchedClients].slice(0, 100),
  }, null, 2));
  console.log(`\n📄 Reporte en: ${reportPath}\n`);

  await prisma.$disconnect();
  await pool.end();
}

const excelPath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.join(process.cwd(), "exportacion.xlsx");

importOrders(excelPath).catch((e) => {
  console.error(e);
  process.exit(1);
});
