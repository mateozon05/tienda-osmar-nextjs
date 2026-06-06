/**
 * import-price-lists.ts
 * ─────────────────────
 * Importa listas de precios desde los Excel de SIPE a la BD.
 *
 * Los archivos tienen formatos distintos:
 *
 * MAYORISTA:
 *   Fila 10 (header): CODIGO | NOMBRE DEL PRODUCTO | PRECIO
 *   Fila 12+:         code   | nombre               | precio
 *   (Hay filas de marca intercaladas como "SAMANTHA" — se omiten si el código no es número)
 *   Resultado: → lista "Mayorista"
 *
 * SAPHIRUS:
 *   Fila 1: CODIGO | DESCRIPCION
 *   Fila 3: col2=UNIDAD | col3=12-48 | col4=48-120 | col5=+120
 *   Fila 4+: code | nombre | precio_unidad | precio_12_48 | precio_48_120 | precio_mas_120
 *   Resultado: → 4 listas Saphirus
 *
 * Uso:
 *   npm run import:prices -- --mayorista "C:/ruta/MAYORISTA.xlsx"
 *   npm run import:prices -- --saphirus  "C:/ruta/SAPHIRUS.xlsx"
 *   npm run import:prices -- --mayorista "C:/..." --saphirus "C:/..."
 */

import { PrismaPg }    from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { Pool }         from "pg";
import * as XLSX        from "xlsx";
import * as path        from "path";
import * as dotenv      from "dotenv";

dotenv.config();

const pool    = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma  = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

// ── Helpers ───────────────────────────────────────────────────────────────────

function parsePrice(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  const n = parseFloat(String(val).replace(",", "."));
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

function isNumericCode(val: unknown): boolean {
  const s = String(val ?? "").trim();
  return s.length > 0 && /^\d+$/.test(s);
}

function readArg(flag: string): string | null {
  const args = process.argv.slice(2);
  const idx  = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

// ── Ensure price lists exist in DB ────────────────────────────────────────────

async function ensureLists() {
  const defs = [
    { name: "Mayorista",         type: "general",  description: "Precio mayorista" },
    { name: "30 Días",           type: "general",  description: "Precio a 30 días" },
    { name: "Saphirus x Unidad", type: "saphirus", description: "Saphirus precio por unidad" },
    { name: "Saphirus 12-48",    type: "saphirus", description: "Saphirus comprando 12 a 48 unidades" },
    { name: "Saphirus 48-120",   type: "saphirus", description: "Saphirus comprando 48 a 120 unidades" },
    { name: "Saphirus +120",     type: "saphirus", description: "Saphirus comprando más de 120 unidades" },
  ];

  const lists: Record<string, { id: number; name: string }> = {};
  for (const def of defs) {
    const pl = await prisma.priceList.upsert({
      where:  { name: def.name },
      update: { type: def.type, isActive: true },
      create: { name: def.name, type: def.type, description: def.description, isActive: true },
    });
    lists[def.name] = pl;
    console.log(`   [${def.type.toUpperCase().padEnd(8)}] ${pl.name} (id=${pl.id})`);
  }
  return lists;
}

// ── Import Mayorista ──────────────────────────────────────────────────────────

async function importMayorista(
  filePath: string,
  lists: Record<string, { id: number; name: string }>
) {
  console.log(`\n📗 Importando Mayorista desde: ${path.basename(filePath)}`);

  const wb   = XLSX.readFile(path.resolve(filePath));
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];

  // Find header row (contains 'CODIGO' and 'PRECIO')
  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const r = (rows[i] as unknown[]).map(c => String(c).trim().toUpperCase());
    if (r.includes("CODIGO") && r.includes("PRECIO")) { headerIdx = i; break; }
  }
  if (headerIdx === -1) { console.error("❌ Header no encontrado"); return; }

  const headers = (rows[headerIdx] as unknown[]).map(c => String(c).trim().toUpperCase());
  const colCode  = headers.indexOf("CODIGO");
  const colPrice = headers.indexOf("PRECIO");

  console.log(`   Header en fila ${headerIdx + 1} → código:col${colCode} precio:col${colPrice}`);

  const dataRows = rows.slice(headerIdx + 1);
  const mayorListId = lists["Mayorista"].id;

  let updated = 0, skipped = 0, errors = 0;

  for (const row of dataRows) {
    const r    = row as unknown[];
    const code = String(r[colCode] ?? "").trim();
    if (!isNumericCode(code)) { skipped++; continue; }

    const price = parsePrice(r[colPrice]);
    if (price <= 0) { skipped++; continue; }

    try {
      const product = await prisma.product.findFirst({ where: { code } });
      if (!product) { skipped++; continue; }

      // Mark as NOT Saphirus
      if (product.isSaphirus) {
        await prisma.product.update({ where: { id: product.id }, data: { isSaphirus: false } });
      }

      await prisma.productPrice.upsert({
        where:  { productId_priceListId: { productId: product.id, priceListId: mayorListId } },
        update: { customPrice: price },
        create: { productId: product.id, priceListId: mayorListId, customPrice: price },
      });

      updated++;
      if (updated % 100 === 0) {
        process.stdout.write(`\r   ⏳ ${updated} actualizados...`);
      }
    } catch (err: unknown) {
      errors++;
      if (errors <= 3) console.error(`\n   ❌ ${code}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n   ✅ Mayorista: ${updated} actualizados, ${skipped} omitidos, ${errors} errores`);
}

// ── Import Saphirus ───────────────────────────────────────────────────────────

async function importSaphirus(
  filePath: string,
  lists: Record<string, { id: number; name: string }>
) {
  console.log(`\n📘 Importando Saphirus desde: ${path.basename(filePath)}`);

  const wb   = XLSX.readFile(path.resolve(filePath));
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];

  // Saphirus format: col0=code, col1=nombre, col2=UNIDAD, col3=12-48, col4=48-120, col5=+120
  // Data starts from row 4 (0-indexed)
  // Find start: first row where col0 is a numeric code
  let dataStart = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const r = rows[i] as unknown[];
    if (isNumericCode(r[0]) && parsePrice(r[2]) > 0) { dataStart = i; break; }
  }
  if (dataStart === -1) { console.error("❌ Datos no encontrados"); return; }

  console.log(`   Datos desde fila ${dataStart + 1}`);

  const unitId   = lists["Saphirus x Unidad"].id;
  const id1248   = lists["Saphirus 12-48"].id;
  const id48120  = lists["Saphirus 48-120"].id;
  const idMas120 = lists["Saphirus +120"].id;

  let updated = 0, skipped = 0, errors = 0;

  for (const row of rows.slice(dataStart)) {
    const r    = row as unknown[];
    const code = String(r[0] ?? "").trim();
    if (!isNumericCode(code)) { skipped++; continue; }

    const pUnit   = parsePrice(r[2]);
    const p1248   = parsePrice(r[3]);
    const p48120  = parsePrice(r[4]);
    const pMas120 = parsePrice(r[5]);

    if (pUnit <= 0) { skipped++; continue; }

    try {
      const product = await prisma.product.findFirst({ where: { code } });
      if (!product) { skipped++; continue; }

      // Mark as Saphirus
      if (!product.isSaphirus) {
        await prisma.product.update({ where: { id: product.id }, data: { isSaphirus: true } });
      }

      const prices = [
        { listId: unitId,   price: pUnit   },
        { listId: id1248,   price: p1248   },
        { listId: id48120,  price: p48120  },
        { listId: idMas120, price: pMas120 },
      ];

      for (const { listId, price } of prices) {
        if (price > 0) {
          await prisma.productPrice.upsert({
            where:  { productId_priceListId: { productId: product.id, priceListId: listId } },
            update: { customPrice: price },
            create: { productId: product.id, priceListId: listId, customPrice: price },
          });
        }
      }

      updated++;
      if (updated % 100 === 0) {
        process.stdout.write(`\r   ⏳ ${updated} actualizados...`);
      }
    } catch (err: unknown) {
      errors++;
      if (errors <= 3) console.error(`\n   ❌ ${code}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n   ✅ Saphirus: ${updated} actualizados, ${skipped} omitidos, ${errors} errores`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const mayorPath   = readArg("--mayorista");
  const saphiPath   = readArg("--saphirus");

  if (!mayorPath && !saphiPath) {
    console.log(`
❌ Faltan argumentos.

Uso:
  npm run import:prices -- --mayorista "C:/ruta/MAYORISTA.xlsx"
  npm run import:prices -- --saphirus  "C:/ruta/SAPHIRUS.xlsx"
  npm run import:prices -- --mayorista "C:/..." --saphirus "C:/..."

Archivos disponibles:
  Mayorista: C:/Users/MATEOZON/Desktop/DO/LISTAS DE PRECIO/MAYORISTA-MAYO-2026.xlsx
  Saphirus:  C:/Users/MATEOZON/Desktop/DO/LISTAS DE PRECIO/SAPHIRUS-MAYO-2026-OK.xlsx
`);
    process.exit(1);
  }

  console.log("\n📊 Creando listas de precios en BD...");
  const lists = await ensureLists();

  if (mayorPath) await importMayorista(mayorPath, lists);
  if (saphiPath) await importSaphirus(saphiPath, lists);

  console.log("\n✅ Importación completada.");
  console.log("📌 Asigná listas a clientes desde /users o /clients en el panel admin.\n");
}

main()
  .catch((err) => { console.error("\n❌ Error fatal:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
