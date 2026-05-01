/**
 * import-brands.ts
 *
 * 1. Crea/actualiza categorías por marca en la BD
 * 2. Importa productos de los 3 Excel asignándolos a su marca
 *
 * Archivos:
 *   INSTITUCIONAL-MAYO-2026-1 (1).xlsx  → cada hoja = una marca
 *   MAYORISTA-MAYO-2026.xlsx            → separadores de marca dentro de GENERAL
 *   SAPHIRUS-MAYO-2026-OK.xlsx          → hoja SAPHIRUS (formato tiers)
 *
 * Uso:
 *   npx tsx scripts/import-brands.ts
 */

import * as XLSX from "xlsx";
import * as path from "path";
import { PrismaClient } from "../app/generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const LISTAS = "C:/Users/MATEOZON/Desktop/LISTAS DE PRECIO";

// ─── Definición de todas las marcas ──────────────────────────────────────────
interface BrandDef {
  name: string;
  slug: string;
  emoji: string;
}

const BRANDS: BrandDef[] = [
  // INSTITUCIONAL
  { name: "ROYCO",                          slug: "royco",                   emoji: "🧹" },
  { name: "HIGIENIK",                       slug: "higienik",                emoji: "🧻" },
  { name: "SEIQ",                           slug: "seiq",                    emoji: "🧪" },
  { name: "ELITE",                          slug: "elite",                   emoji: "⭐" },
  { name: "CAMPANITA",                      slug: "campanita",               emoji: "🔔" },
  { name: "DISPENSADORES ARGENTINOS",       slug: "dispensadores-argentinos", emoji: "🗃️" },
  { name: "GOOD CREAM",                     slug: "good-cream",              emoji: "🧴" },
  { name: "SUIZA",                          slug: "suiza",                   emoji: "🏔️" },
  // SAPHIRUS
  { name: "SAPHIRUS",                       slug: "saphirus",                emoji: "🌸" },
  // MAYORISTA
  { name: "SAMANTHA",                       slug: "samantha",                emoji: "🧹" },
  { name: "MYMY",                           slug: "mymy",                    emoji: "🪣" },
  { name: "CEPILLOS CARIÑO",               slug: "cepillos-carino",         emoji: "🪥" },
  { name: "LIQUIDOS NUESTROS",              slug: "liquidos-nuestros",       emoji: "🧴" },
  { name: "PLASTICOS FLORIDA",              slug: "plasticos-florida",       emoji: "🎨" },
  { name: "CABOS DE MADERA",               slug: "cabos-de-madera",         emoji: "🪵" },
  { name: "BOLSAS ISE",                     slug: "bolsas-ise",              emoji: "🛍️" },
  { name: "EXTRALIMP",                      slug: "extralimp",               emoji: "🫧" },
  { name: "VIANCE",                         slug: "viance",                  emoji: "🧪" },
  { name: "LA PORTEÑA",                    slug: "la-portena",              emoji: "🧴" },
  { name: "MARWHIPER",                      slug: "marwhiper",               emoji: "🧻" },
  { name: "OPTIMO",                         slug: "optimo",                  emoji: "⚡" },
  { name: "CEPILLOS ORTIZ",                slug: "cepillos-ortiz",          emoji: "🪥" },
  { name: "DERMOGREEN / KOMILI",            slug: "dermogreen-komili",       emoji: "🌿" },
  { name: "PLASTICOS COLORES",              slug: "plasticos-colores",       emoji: "🎨" },
  { name: "ETERNO",                         slug: "eterno",                  emoji: "♾️" },
  { name: "MOPA BS",                        slug: "mopa-bs",                 emoji: "🧹" },
  { name: "SUPER GOMA",                     slug: "super-goma",              emoji: "🟡" },
  { name: "TEXTIL DOME",                    slug: "textil-dome",             emoji: "🧺" },
  { name: "TOPEFORM",                       slug: "topeform",                emoji: "🧰" },
  { name: "LAFFITTE",                       slug: "laffitte",                emoji: "🧹" },
  { name: "MAKE",                           slug: "make",                    emoji: "🧼" },
  { name: "VARIOS",                         slug: "varios",                  emoji: "📦" },
];

// ─── Normaliza nombre de marca del Excel → slug ───────────────────────────────
function brandToSlug(raw: string): string {
  const up = raw.trim().toUpperCase();
  // Casos especiales
  if (up.startsWith("DERMOGREEN")) return "dermogreen-komili";
  if (up === "CEPILLOS CARIÑO") return "cepillos-carino";
  if (up === "LA PORTEÑA") return "la-portena";
  // Genérico: minúsculas, espacios → guiones, quitar tildes
  return up
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Interfaz producto normalizado ───────────────────────────────────────────
interface Product {
  code: string;
  name: string;
  price: number;
  brandSlug: string;
}

// ─── Parser INSTITUCIONAL (cada hoja = marca) ─────────────────────────────────
function parseInstitucional(filePath: string): Product[] {
  const wb = XLSX.readFile(filePath);
  const products: Product[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

    // Buscar fila con CODIGO / DESCRIPCIÓN / P.VENTA
    let headerRow = -1;
    let colCode = -1, colName = -1, colPrice = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const r = rows[i].map((v: any) => String(v ?? "").toUpperCase().trim());
      const ci = r.findIndex((v: string) => v === "CODIGO" || v === "CÓDIGO");
      const ni = r.findIndex((v: string) => v.includes("DESCRIPCI") || v === "NOMBRE" || v === "NOMBRE DEL PRODUCTO");
      const pi = r.findIndex((v: string) => v === "P.VENTA" || v === "PRECIO" || v === "PRECIO UNITARIO");
      if (ci !== -1 && ni !== -1 && pi !== -1) {
        headerRow = i; colCode = ci; colName = ni; colPrice = pi;
        break;
      }
    }
    // Fallback: sin header, datos en col 0=code, 1=name, 2=price (ELITE, CAMPANITA, GOOD CREAM, SUIZA)
    if (headerRow === -1) {
      colCode = 0; colName = 1; colPrice = 2;
    }

    const brandSlug = brandToSlug(sheetName);
    const startRow = headerRow === -1 ? 0 : headerRow + 1;
    let count = 0;
    for (let i = startRow; i < rows.length; i++) {
      const r = rows[i];
      const code = r[colCode];
      const name = r[colName];
      const price = Number(r[colPrice]);
      if (typeof code !== "number" || !name || typeof name !== "string" || isNaN(price) || price <= 0) continue;
      products.push({ code: code.toString(), name: name.trim(), price, brandSlug });
      count++;
    }
    if (count === 0 && sheetName !== "Hoja1") {
      console.warn(`  ⚠️  "${sheetName}": 0 productos extraídos`);
    } else if (count > 0) {
      console.log(`  ✅ ${sheetName}: ${count} productos → marca "${brandSlug}"`);
    }
  }

  return products;
}

// ─── Parser MAYORISTA (separadores de marca en GENERAL) ──────────────────────
function parseMayorista(filePath: string): Product[] {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets["GENERAL"];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
  const products: Product[] = [];

  let currentBrandSlug = "varios";
  let currentBrandName = "VARIOS";
  let inData = false;

  for (const row of rows) {
    const col0 = row[0];
    const col1 = row[1];
    const col2 = row[2];

    // Header row: marks start of data section
    if (
      String(col0 ?? "").toUpperCase().includes("CODIGO") &&
      String(col1 ?? "").toUpperCase().includes("NOMBRE")
    ) {
      inData = true;
      continue;
    }
    if (!inData) continue;

    // Brand separator: col0 is a string, col1 and col2 are empty
    if (typeof col0 === "string" && col0.trim() && !col1 && !col2) {
      currentBrandName = col0.trim().toUpperCase();
      currentBrandSlug = brandToSlug(currentBrandName);
      continue;
    }

    // Data row
    const code = col0;
    const name = col1;
    const price = Number(col2);
    if (typeof code !== "number" || !name || isNaN(price) || price <= 0) continue;
    products.push({ code: code.toString(), name: String(name).trim(), price, brandSlug: currentBrandSlug });
  }

  // Stats by brand
  const counts: Record<string, number> = {};
  for (const p of products) counts[p.brandSlug] = (counts[p.brandSlug] ?? 0) + 1;
  for (const [slug, n] of Object.entries(counts)) {
    console.log(`  ✅ ${slug}: ${n} productos`);
  }

  return products;
}

// ─── Parser SAPHIRUS (tiers de precio) ───────────────────────────────────────
function parseSaphirus(filePath: string): Product[] {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets["SAPHIRUS"];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
  const products: Product[] = [];

  for (const row of rows) {
    const code = row[0];
    const name = row[1];
    const price = row[2]; // precio UNIDAD
    if (typeof code !== "number" || !name || typeof price !== "number") continue;
    products.push({ code: code.toString(), name: String(name).trim(), price, brandSlug: "saphirus" });
  }

  console.log(`  ✅ SAPHIRUS: ${products.length} productos`);
  return products;
}

// ─── Prisma client ────────────────────────────────────────────────────────────
function createClient(): PrismaClient {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 Import por marcas iniciado\n");
  const prisma = createClient();

  try {
    // 1. Crear/actualizar categorías de marca
    console.log("📁 Creando categorías de marca...");
    const brandIdBySlug = new Map<string, number>();
    for (const b of BRANDS) {
      const cat = await prisma.category.upsert({
        where: { slug: b.slug },
        update: { name: b.name, emoji: b.emoji },
        create: { name: b.name, slug: b.slug, emoji: b.emoji },
      });
      brandIdBySlug.set(b.slug, cat.id);
      process.stdout.write(".");
    }
    console.log(`\n  ${BRANDS.length} marcas listas.\n`);

    // 2. Parsear archivos
    console.log("📂 INSTITUCIONAL:");
    const institProducts = parseInstitucional(`${LISTAS}/INSTITUCIONAL-MAYO-2026-1 (1).xlsx`);

    console.log("\n📂 MAYORISTA:");
    const mayorProducts = parseMayorista(`${LISTAS}/MAYORISTA-MAYO-2026.xlsx`);

    console.log("\n📂 SAPHIRUS:");
    const saphProducts = parseSaphirus(`${LISTAS}/SAPHIRUS-MAYO-2026-OK.xlsx`);

    const allProducts = [...institProducts, ...mayorProducts, ...saphProducts];
    console.log(`\n📦 Total a importar: ${allProducts.length} productos\n`);

    // 3. Upsert productos
    let created = 0, updated = 0, errors = 0;
    console.log("⏳ Importando...");

    for (const p of allProducts) {
      try {
        const categoryId = brandIdBySlug.get(p.brandSlug) ?? null;

        const existing = await prisma.product.findUnique({
          where: { code: p.code },
          select: { id: true },
        });

        await prisma.product.upsert({
          where: { code: p.code },
          update: { name: p.name, price: p.price, ...(categoryId != null && { categoryId }) },
          create: { code: p.code, name: p.name, price: p.price, stock: 0, active: true, ...(categoryId != null && { categoryId }) },
        });

        if (existing) updated++; else created++;
      } catch (err: any) {
        errors++;
        if (errors <= 5) console.error(`  ❌ ${p.code}: ${err.message}`);
      }
    }

    // 4. Resumen
    const total = await prisma.product.count();
    console.log("\n" + "═".repeat(52));
    console.log("✅  IMPORTACIÓN COMPLETADA");
    console.log("═".repeat(52));
    console.log(`  Nuevos   : ${created}`);
    console.log(`  Actualizados : ${updated}`);
    console.log(`  Errores  : ${errors}`);
    console.log("─".repeat(52));
    console.log(`  Total productos en BD: ${total}`);
    console.log("═".repeat(52));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("💥 Error fatal:", e);
  process.exit(1);
});
