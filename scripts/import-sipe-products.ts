/**
 * import-sipe-products.ts
 * Importa productos del reporte de sincronización SIPE a la tienda.
 * Solo importa los que NO se encontraron en la BD (noEncontrados).
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/import-sipe-products.ts [ruta-reporte.json]
 *   npm run import:sipe
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import * as fs from "fs";
import * as path from "path";

const pool    = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma  = new PrismaClient({ adapter });

// ─── Fix encoding (UTF-8 leído como Windows-1252 desde Excel) ────────────────

function fixEncoding(str: string): string {
  return str
    .replace(/Ã'/g,  "Ñ")
    .replace(/Ã±/g,  "ñ")
    .replace(/Ã³/g,  "ó")
    .replace(/Ã©/g,  "é")
    .replace(/Ã¡/g,  "á")
    .replace(/Ã­/g,  "í")
    .replace(/Ãº/g,  "ú")
    .replace(/Ã¼/g,  "ü")
    .replace(/Ã/g, "Á")
    .replace(/Ã/g, "É")
    .replace(/Ã/g, "Í")
    .replace(/Ã/g, "Ó")
    .replace(/Ã/g, "Ú")
    .replace(/Ã±/g, "ñ")
    .replace(/Ã/g, "Ñ")
    .trim();
}

// ─── Categorías automáticas por palabras clave ───────────────────────────────

const CATEGORY_RULES: Array<{ keywords: string[]; category: string; slug: string; emoji: string }> = [
  {
    keywords: ["AROMATIZANTE", "DIFUSOR", "HOME SPRAY", "AIR COOL", "ESENCIA PARA PERFUMADOR",
                "ESENCIA PATIO", "REP.DIF", "AROMATIZADOR", "AMBIENTADOR", "POCKET"],
    category: "Aromatización", slug: "aromatizacion", emoji: "🌸",
  },
  {
    keywords: ["RAID", "OFF AERO", "OFF CREMA", "FUYI", "BAYGON", "MORTEIN",
                "ANTIPOLILLA", "MATA CUCA", "MATA MOSCA", "INSECTICIDA"],
    category: "Insecticidas", slug: "insecticidas", emoji: "🦟",
  },
  {
    keywords: ["GLADE", "PATO DISCO", "PATO CANASTA", "PATO PURIFIC", "BLEM",
                "MR MUSCULO", "CIF", "LYSOFORM", "CERAMICOL", "ECHO LIMPIADOR",
                "AYUDIN", "ECOMAX CHLOR", "TRAF MULTIUSO", "ANTIGRASA", "LIMPIA VIDRIOS",
                "LIMPIAVIDRIO", "REACTIVO"],
    category: "Limpieza del Hogar", slug: "limpieza-hogar", emoji: "🧹",
  },
  {
    keywords: ["NEROLA", "SANITIZANTE", "HIPOCLORITO", "BACTERICIDA", "DESINFECTANTE",
                "ALCOHOL EN GEL", "ALCOHOL GEL"],
    category: "Higiene y Desinfección", slug: "higiene-desinfeccion", emoji: "🧴",
  },
  {
    keywords: ["GUANTE DE LATEX", "GUANTE DE NITRILO", "GUANTES DESCARTABLE",
                "GUANTES DESCARTABLES", "COFIA", "COFIAS", "CERA DEPILATORIA",
                "CREMA DE MANOS", "CREMA CORPORAL", "SHAMPOO", "MASCARA",
                "MASCARILLA", "ACONDICIONADOR", "DISPLAY ACEITE", "DISPLAY SHOCK",
                "DISPLAY BOTHOX", "DISPLAY KERATINA", "DISPLAY MASCARA", "DISPLAY CANAS",
                "LECHE REAFIRMANTE", "LECHE HUMECTANTE", "LECHE HIDRATANTE",
                "ACTIVADOR ENERGETICO", "CERA CON MIEL", "CERA CON ALOE", "CERA VEGETAL",
                "DERMOGREEN", "KOMILI", "MAIA"],
    category: "Higiene y Belleza", slug: "higiene-belleza", emoji: "💆",
  },
  {
    keywords: ["BOLSA", "BOLSAS", "BANDEJA", "CONTENEDOR", "PAPEL MANTECA",
                "PAPEL HIGIENICO", "ROLLO COCINA", "SERVILLETA", "TOALLA INTERCALADA",
                "TOALLA PLUS", "UNIDAD TOALLA", "UNIDAD SERVILLETA", "SORBETES",
                "AGITADORES DE CAFE", "INDIVIDUAL FONDO", "ZIPLOC", "FILM GASTRONOMIA",
                "SEPARADORES", "ESCARBADIENTE", "PALITOS BROCHET", "HILO GASTRONOMICO",
                "BOBINA PAPEL", "PAPEL HIGIENOL", "PAPEL KRAFT"],
    category: "Descartables y Envases", slug: "descartables-envases", emoji: "📦",
  },
  {
    keywords: ["MOPA", "BARREDOR", "ESCOBA", "PALA ", "PALA REBATIBLE",
                "SECAVIDRIOS", "ARMAZON BARREDOR", "REPUESTO BARREDOR",
                "FRATACHO", "CEPILLO DE PISO", "BARRENDERO", "VELLON DE REPUESTO",
                "MOPA DE LAVADO", "MOPA DE ACABADO", "GOMA DE REPUESTO",
                "ESCOBILLON"],
    category: "Limpieza Profesional", slug: "limpieza-profesional", emoji: "🧺",
  },
  {
    keywords: ["MAPA ULTRANE", "MAPA ULTRANITRIL", "MAPA TECHNI", "MAPA DOBLE"],
    category: "Guantes Industriales", slug: "guantes-industriales", emoji: "🧤",
  },
  {
    keywords: ["LAMPARA LED", "LAMPARA", "HUMIDIFICADOR", "EQUIPO DIGITAL",
                "DISPENSER PARA JABON", "ORGANIZADOR DE MESADA", "DISPLAY", "ADAPTADOR"],
    category: "Equipamiento", slug: "equipamiento", emoji: "🔧",
  },
  {
    keywords: ["ESPONJA", "FIBRA ABRASIVA", "BROCHE DE MADERA", "COLADOR",
                "FLORES ANTIDESLIZANTES", "PASACERA", "LIMPIA BOMBILLA",
                "ACIDO REGULADOR", "CERA 8M"],
    category: "Accesorios de Limpieza", slug: "accesorios-limpieza", emoji: "🧽",
  },
  {
    keywords: ["CORTINA DE BAÑO", "CORTINA DE BAÃ'O", "FUENTON", "BANDEJA MICRO",
                "BANDEJA N", "CAJA DE HAMBURGUESAS", "ESTUCHE EQUIPO",
                "BOLSA PARA HORNO", "BOBINA"],
    category: "Varios", slug: "varios", emoji: "🛒",
  },
];

function assignCategory(nombre: string): { category: string; slug: string; emoji: string } | null {
  const upper = nombre.toUpperCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(k => upper.includes(k.toUpperCase()))) {
      return { category: rule.category, slug: rule.slug, emoji: rule.emoji };
    }
  }
  return null;
}

// ─── Validar si un producto debe importarse ───────────────────────────────────

const INVALID_NAMES = [
  "error", "ERROR", "sin dato", "sin nombre",
  "CATALOGO", "AFICHE", "TALONARIO PRESUPUESTO", "TALONARIO",
  "BOLSA LOCAL", "BOLSON LOCAL", "Consultura",
  "PAQUETE DE FOLEX SEPARADOR",   // material de oficina, no producto
];

function isValidProduct(codigo: string, nombre: string): boolean {
  if (!codigo || !nombre) return false;
  if (nombre.length < 3) return false;
  if (INVALID_NAMES.some(inv => nombre.toLowerCase().includes(inv.toLowerCase()))) return false;
  if (nombre.toLowerCase() === "error") return false;
  if (nombre.toLowerCase().startsWith("sin ")) return false;
  // Códigos no numéricos raros
  if (!/^\d+$/.test(codigo)) return false;
  return true;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function importSipeProducts(reportPath: string): Promise<void> {
  if (!fs.existsSync(reportPath)) {
    throw new Error(`Reporte no encontrado: ${reportPath}`);
  }

  const report = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
  const noEncontrados: Array<{ codigo: string; nombre: string; stock: number }> = report.detalles.noEncontrados;

  console.log(`\n📂 Leyendo reporte: ${path.resolve(reportPath)}`);
  console.log(`   Total no encontrados en reporte: ${noEncontrados.length}`);

  // Filtrar válidos
  const validos = noEncontrados.filter(p => isValidProduct(p.codigo, p.nombre));
  console.log(`   Válidos para importar: ${validos.length}`);
  console.log(`   Descartados (inválidos): ${noEncontrados.length - validos.length}\n`);

  // Obtener/crear categorías en BD
  const categoryCache = new Map<string, number>(); // slug → id

  async function getCategoryId(info: { category: string; slug: string; emoji: string } | null): Promise<number | null> {
    if (!info) return null;
    if (categoryCache.has(info.slug)) return categoryCache.get(info.slug)!;

    const cat = await prisma.category.upsert({
      where:  { slug: info.slug },
      update: {},
      create: { name: info.category, slug: info.slug, emoji: info.emoji },
    });
    categoryCache.set(info.slug, cat.id);
    return cat.id;
  }

  // Contadores
  let importados  = 0;
  let omitidos    = 0; // ya existían
  let sinCategoria = 0;
  let errores     = 0;
  const errList:  Array<{ codigo: string; nombre: string; error: string }> = [];
  const sinCatList: Array<{ codigo: string; nombre: string }> = [];

  console.log("⏳ Importando productos...\n");

  for (let i = 0; i < validos.length; i++) {
    const prod = validos[i];
    if ((i + 1) % 50 === 0) {
      process.stdout.write(`   [${i + 1}/${validos.length}] importados: ${importados} | omitidos: ${omitidos}\r`);
    }

    try {
      // Verificar si ya existe
      const existing = await prisma.product.findFirst({ where: { code: prod.codigo } });
      if (existing) { omitidos++; continue; }

      const nombreFixed = fixEncoding(prod.nombre);
      const catInfo = assignCategory(nombreFixed);
      const categoryId = await getCategoryId(catInfo);

      if (!catInfo) {
        sinCategoria++;
        sinCatList.push({ codigo: prod.codigo, nombre: nombreFixed });
      }

      await prisma.product.create({
        data: {
          code:       prod.codigo,
          name:       nombreFixed,
          price:      0,
          stock:      prod.stock,
          active:     prod.stock > 0,  // visible solo si tiene stock
          categoryId: categoryId ?? undefined,
        },
      });

      importados++;
    } catch (err) {
      errores++;
      errList.push({
        codigo: prod.codigo,
        nombre: prod.nombre,
        error:  err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ─── Reporte final ────────────────────────────────────────────────────────

  console.log("\n\n" + "═".repeat(60));
  console.log("📊 REPORTE DE IMPORTACIÓN");
  console.log("═".repeat(60));
  console.log(`  ✅ Importados:              ${importados}`);
  console.log(`  ⏭️  Ya existían (omitidos): ${omitidos}`);
  console.log(`  ⚠️  Sin categoría asignada: ${sinCategoria}`);
  console.log(`  ❌ Errores:                 ${errores}`);
  console.log("═".repeat(60));

  if (sinCatList.length > 0) {
    console.log(`\n⚠️  Productos importados SIN categoría (${sinCatList.length}):`);
    sinCatList.slice(0, 20).forEach(p => console.log(`   [${p.codigo}] ${p.nombre}`));
    if (sinCatList.length > 20) console.log(`   ... y ${sinCatList.length - 20} más`);
  }

  if (errList.length > 0) {
    console.log("\n❌ Errores:");
    errList.forEach(e => console.log(`   [${e.codigo}] ${e.nombre} — ${e.error}`));
  }

  // Guardar reporte
  const outPath = path.join(path.dirname(reportPath), "sipe-import-report.json");
  fs.writeFileSync(outPath, JSON.stringify({
    fecha: new Date().toISOString(),
    resumen: { validos: validos.length, importados, omitidos, sinCategoria, errores },
    sinCategoria: sinCatList,
    errores: errList,
  }, null, 2), "utf-8");

  console.log(`\n📄 Reporte guardado: ${outPath}`);
  console.log("\n✅ Importación completada\n");
}

// ─── Entry point ─────────────────────────────────────────────────────────────

const reportPath = process.argv[2] || "C:\\Users\\MATEOZON\\Downloads\\sipe-sync-report.json";

importSipeProducts(reportPath)
  .catch(err => {
    console.error("\n❌ Error fatal:", err.message);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
