/**
 * fix-categories.ts
 * Asigna categorías a productos importados que quedaron sin categoría.
 * Amplía las reglas de la importación inicial.
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/fix-categories.ts
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const pool    = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma  = new PrismaClient({ adapter });

// ─── Reglas ampliadas ─────────────────────────────────────────────────────────

const RULES: Array<{ keywords: string[]; category: string; slug: string; emoji: string }> = [
  // --- Ropa y equipamiento de trabajo ---
  {
    keywords: ["AMBO ", "BUZO ", "CAMPERA", "CAMISA DE TRABAJO", "CHOMBA", "CARGO ",
                "MAMELUCO", "PANTALON OMBU", "REMERA", "ZAPATILLA OMBU",
                "BOTIN DE TRABAJO", "CASCO "],
    category: "Ropa de Trabajo", slug: "ropa-trabajo", emoji: "👷",
  },
  // --- Higiene y Desinfección (cloro, jabones de manos, barbijos, guantes nitrilo) ---
  {
    keywords: ["CLORO ", "CLORO X", "CLORO GRANULADO", "CLORO DISOLUCION", "CLORO PASTILLAS",
                "BARBIJO", "JABON LIQUIDO PARA MANOS", "GUANTES DE NITRILO", "TEST KIT",
                "REACTIVO CLORO", "REACTIVO PH"],
    category: "Higiene y Desinfección", slug: "higiene-desinfeccion", emoji: "🧴",
  },
  // --- Higiene y Belleza (jabones de tocador, rexona) ---
  {
    keywords: ["JABON DE TOCADOR", "JABON LUX", "JABON PAN", "SEISEME",
                "REXONA JABON", "GRAN LEÑO"],
    category: "Higiene y Belleza", slug: "higiene-belleza", emoji: "💆",
  },
  // --- Limpieza del hogar (detergentes, suavizante, cloro doméstico, pastillas inodoro) ---
  {
    keywords: ["ALA MATIC", "ALA ULTRA", "DETERGENTE TIPO MAGISTRAL", "DESODORANTE PISO",
                "FINISH DETERGENTE", "GRANBY MATIC", "VIVERE CLASICO", "VIVERE DOYPACK",
                "LIMPIA HORNO", "MISTER MUSCULO", "PASTILLA PARA INODORO",
                "PATO ADHESIVO", "PATO BLOQUE", "PATO MANUAL", "PATO PURIFIC DISCO",
                "POETT", "STEEL CLEANER", "BUENOS DIAS FOSFORO", "BUENOS DÍAS FOSFOROS",
                "AYUDIN"],
    category: "Limpieza del Hogar", slug: "limpieza-hogar", emoji: "🧹",
  },
  // --- Insecticidas (OFF que faltó) ---
  {
    keywords: ["OFF SPRAY", "OFF AERO", "OFF CREMA"],
    category: "Insecticidas", slug: "insecticidas", emoji: "🦟",
  },
  // --- Aromatización (esencias a granel, líquido humidificador, hornillo) ---
  {
    keywords: ["ESENCIA CHICLE", "ESENCIA INSOLENCE", "ESENCIA PATIO",
                "LIQ.HUMI", "HORNILLO ELECTRICO SAPHIRUS", "HUMIDIFICADOR"],
    category: "Aromatización", slug: "aromatizacion", emoji: "🌸",
  },
  // --- Descartables y Envases ---
  {
    keywords: ["VASO TERMICO", "VASOS DESCARTABLES", "VASOS TERMICOS", "COPA PLASTICA",
                "PLATO BLANCO", "PLATO NEGRO", "TENEDOR X", "TENEDORES DESCARTABLES",
                "TENEDOR NEGRO", "CUCHARITAS X", "CUCHILLOS DESCARTABLES",
                "POSA VASO", "MANGA NUMERO", "SEPARADOR ", "SEPARADORES",
                "ROLLO TERMICO", "ROLLO DE ETIQUETAS", "ROLLO DE PAPEL ALUMINIO",
                "ROLLO FILM", "PAPEL ALUMINIO", "PAPEL FILM", "PAPEL HAMBURGUESA",
                "MEGA ROLLO", "ROLLO DE COCINA", "BOLSON ROLLO", "CAJA DE PAÑUELOS",
                "PAÑUELO BOX", "PAÑO MAXWIPE", "CARTON CORRUGADO",
                "HERMETICO REDONDO", "CINTA EMBALAR", "TALONARIO",
                "ETIQUETA AUTOHADESIVAS", "BIDON X", "COPA PLASTICA",
                "ROLLO DE FILM GASTRONOMICO", "FILM 30X", "FILM 45X",
                "ROLLO TERM", "BOBINA PAPEL"],
    category: "Descartables y Envases", slug: "descartables-envases", emoji: "📦",
  },
  // --- Limpieza profesional (secadores, mopas, lampazo, lavavidrios, soportes, extensores) ---
  {
    keywords: ["SECADOR DE PISO", "SECADOR DE ALUMINIO", "SECADOR PLANO",
                "SECADOR DUO", "SECADOR MUSTO", "SECADOR ROJO", "SECADOR SUPER",
                "SOPORTE DE ACERO", "SOPORTE DE ALUMINIO",
                "LAVAVIDRIOS COMPLETO", "EXTENSOR MULTIUSO",
                "MOPIN DE ALGODON", "MOPIN ECONOMICO", "MULTISERVICIOS GRIS",
                "LAMPAZO", "PAD MICROFIBRA", "SACA HOJA", "SACAHOJAS",
                "BARRE HOJAS", "PALAS CON CABO", "BALDE ANATOMICO",
                "BALDE RECTANGULAR VIDRIERO", "CARRO ZORRITA",
                "BOYA CONO", "BOYA SATELITE"],
    category: "Limpieza Profesional", slug: "limpieza-profesional", emoji: "🧺",
  },
  // --- Accesorios de limpieza (cepillos, trapos, paños, esponjas, balde doméstico, espatula) ---
  {
    keywords: ["TRAPO BLANCO", "TRAPO GRIS",
                "PAÑO AMARILLO", "PAÑO MICROFIBRA", "PAÑO MAXWIPE",
                "PAÃ'O AMARILLO", "PAÃ'O MICROFIBRA", "PAÃ'O MAXWIPE",
                "CEPILLO ANGULAR", "CEPILLO AUTO", "CEPILLO BOOTY", "CEPILLO CAMION",
                "CEPILLO CERDAS", "CEPILLO DE GOMA", "CEPILLO HARD",
                "CEPILLO HIDRO", "CEPILLO IRON", "CEPILLO LIMPIA",
                "CEPILLO LONGER", "CEPILLO MAQUINARIA", "CEPILLO MICRO",
                "CEPILLO MINI TOKI", "CEPILLO MULTIUSO", "CEPILLO ORKO",
                "CEPILLO PARRILLERO", "CEPILLO PIPE", "CEPILLO TOKI",
                "CEPILLO UTILITARIO",
                "BAQUETAS PBT",
                "PLUMERO CURVO", "PLUMERO TECHO", "PLUMERO DE LANA", "PLUMERO N20",
                "ESPATULA", "SOPAPITA", "SOPAPON",
                "ESCOBITA", "JARRA MEDIDORA",
                "BROCHES PLASTICOS", "PERCHA CAPILLA", "PERCHAS PLASTICA",
                "CUBETERAS", "FELPUDO", "FILTRO PARA PURIFICADOR",
                "RASCADOR DE BOLSILLO", "CUCHILLA PARA RASCADOR",
                "FIBRA PARRILLERA", "FIBRA VERDE", "FBIRA VERDE",
                "TENDER ", "TENDER SIN", "TENDER C/",
                "BALDE X9", "PULVERIZADOR",
                "REJILLA AUTOPESADA", "CHANGO DE COMPRAS"],
    category: "Accesorios de Limpieza", slug: "accesorios-limpieza", emoji: "🧽",
  },
  // --- Varios ---
  {
    keywords: ["ANTORCHITA", "BANDITAS ELASTICAS", "BUZON", "CARTEL SALIDA",
                "LAPICERA", "LOGO BORDADO", "MOÑO MAGICO", "PILA DOBLE",
                "PILA TRIPLE", "TIZA COLORES", "EXHIBIDOR DE PIE",
                "FLORES ANTIDESLIZANTES", "90x110", "AMBO GRAFIL",
                "BUENOS DIAS", "BUENOS DÍAS"],
    category: "Varios", slug: "varios", emoji: "🛒",
  },
];

// ─── Caché de categorías ──────────────────────────────────────────────────────

const categoryCache = new Map<string, number>();

async function getCategoryId(info: { category: string; slug: string; emoji: string }): Promise<number> {
  if (categoryCache.has(info.slug)) return categoryCache.get(info.slug)!;
  const cat = await prisma.category.upsert({
    where:  { slug: info.slug },
    update: {},
    create: { name: info.category, slug: info.slug, emoji: info.emoji },
  });
  categoryCache.set(info.slug, cat.id);
  return cat.id;
}

function findRule(name: string) {
  const upper = name.toUpperCase();
  for (const rule of RULES) {
    if (rule.keywords.some(k => upper.includes(k.toUpperCase()))) return rule;
  }
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function fixCategories(): Promise<void> {
  // Buscar productos sin categoría
  const sinCat = await prisma.product.findMany({
    where: { categoryId: null },
    select: { id: true, code: true, name: true },
  });

  console.log(`\n🔍 Productos sin categoría en BD: ${sinCat.length}\n`);

  let asignados  = 0;
  let sinMatch   = 0;
  const noMatch: Array<{ code: string; name: string }> = [];

  for (const prod of sinCat) {
    const rule = findRule(prod.name);
    if (!rule) {
      sinMatch++;
      noMatch.push({ code: prod.code, name: prod.name });
      continue;
    }

    const categoryId = await getCategoryId(rule);
    await prisma.product.update({
      where: { id: prod.id },
      data:  { categoryId },
    });
    asignados++;
  }

  console.log("═".repeat(60));
  console.log("📊 RESULTADO");
  console.log("═".repeat(60));
  console.log(`  ✅ Categorías asignadas: ${asignados}`);
  console.log(`  ❓ Aún sin categoría:    ${sinMatch}`);
  console.log("═".repeat(60));

  if (noMatch.length > 0) {
    console.log(`\n❓ Sin categoría (${noMatch.length}):`);
    noMatch.forEach(p => console.log(`   [${p.code}] ${p.name}`));
  }

  console.log("\n✅ Listo\n");
}

fixCategories()
  .catch(err => { console.error("\n❌ Error:", err.message); process.exit(1); })
  .finally(async () => { await pool.end(); });
