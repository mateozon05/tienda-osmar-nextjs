/**
 * Script universal de importación de productos desde Excel → Neon PostgreSQL
 *
 * Soporta dos formatos de archivo:
 *
 * FORMATO A — "Lista simple" (ej: PRODUCTOS OSMAR PRUEBA.xlsx, MAYORISTA.xlsx)
 *   Headers en alguna fila: CODIGO | NOMBRE / NOMBRE DEL PRODUCTO | PRECIO
 *   Datos desde la fila siguiente al header.
 *
 * FORMATO B — "Nota de pedido Saphirus" (ej: SAPHIRUS MAYORISTA.xlsx)
 *   Row 0: título
 *   Row 1: "CODIGO", "DESCRIPCION"
 *   Row 2: vacía
 *   Row 3: null, null, "UNIDAD", "12-48", "48-120", "+120"   ← tiers de precio
 *   Row 4+: [codigo, nombre, precio_unidad, ...]
 *
 * FORMATO C — "Institucional" (detección automática)
 *   Busca columnas con variantes de CODIGO/SKU, NOMBRE/DESCRIPCION, PRECIO
 *
 * Uso:
 *   npx tsx scripts/import-multi.ts [archivo1.xlsx] [archivo2.xlsx] ...
 *   Si no se pasan argumentos, importa los archivos configurados en FILES_TO_IMPORT.
 */

import * as XLSX from "xlsx";
import * as path from "path";
import { PrismaClient } from "../app/generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// ─── Archivos a importar (editar según necesidad) ────────────────────────────
const DESKTOP = "C:/Users/MATEOZON/Desktop";
const FILES_TO_IMPORT: { file: string; category?: string; brand?: string }[] = [
  { file: `${DESKTOP}/SAPHIRUS-MAYO-2026-OK.xlsx`,           category: "desinfeccion" },
  { file: `${DESKTOP}/INSTITUCIONAL-MAYO-2026-1__1_.xlsx` },
];

// ─── Mapeo marca → slug de categoría ─────────────────────────────────────────
const BRAND_CATEGORY: Record<string, string> = {
  SAPHIRUS: "desinfeccion",
  DISNEY: "accesorios",
  SAMANTHA: "limpieza",
  MYMY: "limpieza",
  "CEPILLOS CARIÑO": "limpieza",
  "LIQUIDOS NUESTROS": "desinfeccion",
  "PLASTICOS FLORIDA": "accesorios",
  "CABOS DE MADERA": "accesorios",
  "BOLSAS ISE": "limpieza",
  EXTRALIMP: "limpieza",
  VIANCE: "desinfeccion",
  "LA PORTEÑA": "desinfeccion",
  MARWHIPER: "limpieza",
  OPTIMO: "limpieza",
  "CEPILLOS ORTIZ": "limpieza",
  DERMOGREEN: "desinfeccion",
  KOMILI: "desinfeccion",
  ETERNO: "accesorios",
  "MOPA BS": "limpieza",
  "SUPER GOMA": "limpieza",
  "TEXTIL DOME": "lavanderia",
  TOPEFORM: "accesorios",
  LAFFITTE: "limpieza",
  MAKE: "limpieza",
};

// ─── Normalizar string: trim + mayúsculas ─────────────────────────────────────
function norm(v: any): string {
  return v != null ? v.toString().trim().toUpperCase() : "";
}

// ─── Detectar categoría por nombre de producto ───────────────────────────────
function guessCategoryFromName(name: string): string | null {
  const n = name.toUpperCase();
  if (n.match(/LAVANDINA|CLORO|BLANQUEADOR/)) return "desinfeccion";
  if (n.match(/DETERGENTE|JABON|JABÓN|LAVARROP/)) return "lavanderia";
  if (n.match(/DESENGRASANTE|DESINFECT|ALCOHOL|GEL ANTIBACT/)) return "desinfeccion";
  if (n.match(/ESCOBA|TRAPEADOR|MOPA|BALDE|CEPILLO|TRAPO|FRANELA/)) return "limpieza";
  if (n.match(/BOLSA|RESIDUO/)) return "limpieza";
  if (n.match(/AMBIENTADOR|AROMATIZ|DIFUSOR|ACEITE ESENCIAL/)) return "desinfeccion";
  if (n.match(/GUANTE/)) return "limpieza";
  if (n.match(/PISO|PISOS/)) return "pisos";
  if (n.match(/BANO|BAÑO|INODORO/)) return "bano";
  if (n.match(/COCINA/)) return "cocina";
  return null;
}

// ─── Interfaz producto normalizado ───────────────────────────────────────────
interface Product {
  code: string;
  name: string;
  price: number;
  categorySlug: string | null;
}

// ─── FORMATO B: Saphirus ──────────────────────────────────────────────────────
function parseSaphirusSheet(
  ws: XLSX.WorkSheet,
  sheetName: string,
  forcedCategory?: string
): Product[] {
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const products: Product[] = [];

  const brand = sheetName.toUpperCase().includes("DISNEY") ? "DISNEY" : "SAPHIRUS";
  const categorySlug =
    forcedCategory ??
    BRAND_CATEGORY[brand] ??
    guessCategoryFromName(brand) ??
    null;

  for (const row of rows) {
    const code = row[0];
    const name = row[1];
    const price = row[2]; // precio UNIDAD

    if (typeof code !== "number" || !name || typeof price !== "number") continue;

    products.push({
      code: code.toString(),
      name: name.toString().trim(),
      price,
      categorySlug,
    });
  }

  return products;
}

// ─── FORMATO A/C: Lista simple con headers ────────────────────────────────────
function parseListSheet(
  ws: XLSX.WorkSheet,
  forcedCategory?: string
): Product[] {
  const allRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const products: Product[] = [];

  // Buscar fila de headers — buscamos una fila con palabras clave
  const CODIGO_KEYS = ["CODIGO", "CÓDIGO", "SKU", "COD", "CODE"];
  const NOMBRE_KEYS = ["NOMBRE", "NOMBRE DEL PRODUCTO", "DESCRIPCION", "DESCRIPCIÓN", "PRODUCTO", "NAME"];
  const PRECIO_KEYS = ["PRECIO", "PRECIO REGULAR", "PRECIO UNITARIO", "PRICE", "UNIDAD"];

  let headerRow = -1;
  let colCodigo = -1;
  let colNombre = -1;
  let colPrecio = -1;

  for (let i = 0; i < Math.min(allRows.length, 20); i++) {
    const row = allRows[i].map((v: any) => norm(v));
    const coIdx = row.findIndex((v: string) => CODIGO_KEYS.includes(v));
    const nmIdx = row.findIndex((v: string) => NOMBRE_KEYS.includes(v));
    const prIdx = row.findIndex((v: string) => PRECIO_KEYS.includes(v));

    if (coIdx !== -1 && nmIdx !== -1 && prIdx !== -1) {
      headerRow = i;
      colCodigo = coIdx;
      colNombre = nmIdx;
      colPrecio = prIdx;
      break;
    }
  }

  if (headerRow === -1) {
    console.warn(`  ⚠️  No se encontraron columnas CODIGO/NOMBRE/PRECIO`);
    return products;
  }

  // Leer datos desde la fila siguiente al header
  for (let i = headerRow + 1; i < allRows.length; i++) {
    const row = allRows[i];
    if (!row || row.length === 0) continue;

    const rawCode = row[colCodigo];
    const rawName = row[colNombre];
    const rawPrice = row[colPrecio];

    const code = rawCode != null ? rawCode.toString().trim() : "";
    const name = rawName != null ? rawName.toString().trim() : "";
    const price = Number(rawPrice);

    if (!code || !name || isNaN(price) || price <= 0) continue;

    const categorySlug =
      forcedCategory ?? guessCategoryFromName(name) ?? null;

    products.push({ code, name, price, categorySlug });
  }

  return products;
}

// ─── Detectar formato y parsear archivo ──────────────────────────────────────
function parseFile(
  filePath: string,
  forcedCategory?: string
): Product[] {
  console.log(`\n📂 Leyendo: ${path.basename(filePath)}`);
  const wb = XLSX.readFile(filePath);
  const allProducts: Product[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const firstRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 }).slice(0, 5);
    const firstFlat = firstRows.flat().map((v: any) => norm(v));

    // Detectar formato Saphirus: tiene "UNIDAD" como header de precio
    const isSaphirus = firstFlat.includes("UNIDAD") || firstFlat.includes("NOTA DE PEDIDO SAPHIRUS");

    let products: Product[];
    if (isSaphirus) {
      console.log(`  📄 Hoja "${sheetName}" → Formato Saphirus`);
      products = parseSaphirusSheet(ws, sheetName, forcedCategory);
    } else {
      console.log(`  📄 Hoja "${sheetName}" → Formato Lista`);
      products = parseListSheet(ws, forcedCategory);
    }

    console.log(`     ${products.length} productos encontrados`);
    allProducts.push(...products);
  }

  return allProducts;
}

// ─── Prisma client ────────────────────────────────────────────────────────────
function createClient(): PrismaClient {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const filesToProcess =
    args.length > 0
      ? args.map((f) => ({ file: f, category: undefined, brand: undefined }))
      : FILES_TO_IMPORT;

  console.log("🚀 Importación multi-Excel iniciada");
  console.log(`📋 Archivos a procesar: ${filesToProcess.length}\n`);

  const prisma = createClient();

  try {
    // Cargar categorías
    const categories = await prisma.category.findMany();
    const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));
    console.log(`📁 Categorías disponibles: ${[...categoryBySlug.keys()].join(", ")}\n`);

    let totalCreated = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    let totalSkipped = 0;

    for (const { file, category } of filesToProcess) {
      // Verificar que el archivo existe
      const fs = await import("fs");
      if (!fs.existsSync(file)) {
        console.warn(`⚠️  Archivo no encontrado, saltando: ${file}`);
        totalSkipped++;
        continue;
      }

      // Parsear
      const products = parseFile(file, category);

      if (products.length === 0) {
        console.warn(`  ⚠️  Sin productos extraídos de ${path.basename(file)}`);
        continue;
      }

      // Importar con upsert
      console.log(`\n⏳ Importando ${products.length} productos de ${path.basename(file)}...`);
      let created = 0;
      let updated = 0;
      let errors = 0;

      for (const p of products) {
        try {
          const categoryId = p.categorySlug
            ? (categoryBySlug.get(p.categorySlug) ?? null)
            : null;

          const existing = await prisma.product.findUnique({
            where: { code: p.code },
            select: { id: true },
          });

          await prisma.product.upsert({
            where: { code: p.code },
            update: {
              name: p.name,
              price: p.price,
              ...(categoryId != null && { categoryId }),
            },
            create: {
              code: p.code,
              name: p.name,
              price: p.price,
              stock: 0,
              active: true,
              ...(categoryId != null && { categoryId }),
            },
          });

          if (existing) updated++;
          else created++;
        } catch (err: any) {
          errors++;
          if (errors <= 5) {
            console.error(`  ❌ Error en código ${p.code}: ${err.message}`);
          }
        }
      }

      totalCreated += created;
      totalUpdated += updated;
      totalErrors += errors;

      console.log(`  ✅ ${path.basename(file)}: ${created} nuevos, ${updated} actualizados, ${errors} errores`);
    }

    // Resumen global
    const totalInDB = await prisma.product.count();
    console.log("\n" + "═".repeat(52));
    console.log("✅  IMPORTACIÓN COMPLETADA");
    console.log("═".repeat(52));
    console.log(`  Nuevos creados   : ${totalCreated}`);
    console.log(`  Actualizados     : ${totalUpdated}`);
    console.log(`  Errores          : ${totalErrors}`);
    console.log(`  Archivos saltados: ${totalSkipped}`);
    console.log("─".repeat(52));
    console.log(`  Total productos en BD: ${totalInDB}`);
    console.log("═".repeat(52));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("💥 Error fatal:", e);
  process.exit(1);
});
