/**
 * Script de importación de productos desde Excel a Neon PostgreSQL
 * Fuente: PRODUCTOS OSMAR PRUEBA.xlsx (648 productos)
 * Uso: npx tsx scripts/import-products.ts
 */

import * as XLSX from "xlsx";
import * as path from "path";
import { PrismaClient } from "../app/generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// ─── Prisma client ───────────────────────────────────────────────────────────
function createClient(): PrismaClient {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// ─── Mapeo marca → slug de categoría ─────────────────────────────────────────
const BRAND_TO_CATEGORY: Record<string, string> = {
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
  "DERMOGREEN/KOMILI/AQUA DI FIORE Y ENVASES": "desinfeccion",
  "PLASTICOS COLORES": "accesorios",
  ETERNO: "accesorios",
  "MOPA BS": "limpieza",
  "SUPER GOMA": "limpieza",
  "TEXTIL DOME": "lavanderia",
  TOPEFORM: "accesorios",
  LAFFITTE: "limpieza",
  MAKE: "limpieza",
  VARIOS: "accesorios",
};

// ─── Leer archivo Excel de marcas (para mapeo CODIGO → marca) ─────────────────
function loadBrandMap(): Map<number, string> {
  const filePath = path.resolve(
    "C:/Users/MATEOZON/Desktop/PRECIOS PRODUCTOS OSMAR.xlsx"
  );

  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets["GENERAL"];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const brandMap = new Map<number, string>();
  let currentBrand = "VARIOS";

  for (const row of rows) {
    const col0 = row[0]?.toString().trim() ?? "";
    const col1 = row[1]?.toString().trim() ?? "";
    const col3 = row[3]; // SKU numérico

    // Si col0 tiene texto y col1 tiene texto → es un producto con marca en col0
    // Si col0 tiene texto y col1 está vacío → es un encabezado de marca
    if (col0 && !col1) {
      currentBrand = col0.toUpperCase();
      continue;
    }

    if (col3 && typeof col3 === "number") {
      brandMap.set(col3, currentBrand);
    }
  }

  console.log(`📦 Marcas mapeadas: ${brandMap.size} productos con marca`);
  return brandMap;
}

// ─── Leer productos principales ───────────────────────────────────────────────
interface RawProduct {
  CODIGO: number;
  NOMBRE: string;
  PRECIO: number;
}

function loadProducts(): RawProduct[] {
  const filePath = path.resolve(
    "C:/Users/MATEOZON/Desktop/PRODUCTOS OSMAR PRUEBA.xlsx"
  );

  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets["GENERAL"];
  // Normalizar nombres de columnas (eliminar espacios extra)
  const rawRows: any[] = XLSX.utils.sheet_to_json(ws);
  const rows = rawRows.map((row) => {
    const normalized: Record<string, any> = {};
    for (const key of Object.keys(row)) {
      normalized[key.trim()] = typeof row[key] === "string" ? row[key].trim() : row[key];
    }
    return normalized;
  });

  const products: RawProduct[] = [];

  for (const row of rows) {
    const codigo = Number(row["CODIGO"]);
    const nombre = row["NOMBRE"]?.toString().trim();
    const precio = Number(row["PRECIO"]);

    if (!codigo || !nombre || !precio) continue;

    products.push({ CODIGO: codigo, NOMBRE: nombre, PRECIO: precio });
  }

  console.log(`📋 Productos leídos del Excel: ${products.length}`);
  return products;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 Iniciando importación de productos...\n");

  const prisma = createClient();

  try {
    // 1. Cargar categorías existentes en DB
    const categories = await prisma.category.findMany();
    const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));
    console.log(
      `📁 Categorías en DB: ${categories.map((c) => c.slug).join(", ")}\n`
    );

    // 2. Cargar mapa de marcas
    let brandMap: Map<number, string>;
    try {
      brandMap = loadBrandMap();
    } catch (e) {
      console.warn("⚠️  No se pudo cargar PRECIOS OSMAR.xlsx, sin marcas");
      brandMap = new Map();
    }

    // 3. Cargar productos del Excel
    const products = loadProducts();

    // 4. Importar con upsert
    let created = 0;
    let updated = 0;
    let errors = 0;

    console.log(`\n⏳ Importando ${products.length} productos...\n`);

    for (const p of products) {
      try {
        // Obtener categoría por marca
        const brand = brandMap.get(p.CODIGO) ?? "VARIOS";
        const categorySlug = BRAND_TO_CATEGORY[brand] ?? "accesorios";
        const categoryId = categoryBySlug.get(categorySlug) ?? null;

        const result = await prisma.product.upsert({
          where: { code: p.CODIGO.toString() },
          update: {
            name: p.NOMBRE,
            price: p.PRECIO,
            categoryId,
          },
          create: {
            code: p.CODIGO.toString(),
            name: p.NOMBRE,
            price: p.PRECIO,
            stock: 0,
            active: true,
            categoryId,
          },
        });

        // Detectar si fue creado o actualizado (comparar timestamps)
        const wasCreated =
          Math.abs(
            result.createdAt.getTime() - result.updatedAt.getTime()
          ) < 1000;
        if (wasCreated) {
          created++;
        } else {
          updated++;
        }
      } catch (err: any) {
        errors++;
        console.error(
          `  ❌ Error en código ${p.CODIGO} (${p.NOMBRE}): ${err.message}`
        );
      }
    }

    // 5. Resumen
    console.log("\n" + "─".repeat(50));
    console.log("✅ IMPORTACIÓN COMPLETADA");
    console.log("─".repeat(50));
    console.log(`  Productos procesados : ${products.length}`);
    console.log(`  Creados              : ${created}`);
    console.log(`  Actualizados         : ${updated}`);
    console.log(`  Errores              : ${errors}`);
    console.log("─".repeat(50));

    // 6. Conteo final en DB
    const totalInDB = await prisma.product.count();
    console.log(`\n📊 Total productos en BD: ${totalInDB}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("💥 Error fatal:", e);
  process.exit(1);
});
