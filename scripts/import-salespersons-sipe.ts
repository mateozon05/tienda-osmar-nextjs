/**
 * import-salespersons-sipe.ts
 * ───────────────────────────
 * Importa vendedores desde el Excel de SIPE a la base de datos.
 *
 * Estructura del Excel:
 *   Fila 0: header info  ("Nombre: " / "Lista de Vendedores")
 *   Fila 1: vacía
 *   Fila 2: columnas     ("Nombre", "Comisión (%)")
 *   Fila 3: fila vacía   ("", 0)
 *   Fila 4+: datos       ("MATEO 7", 7) / ("MATEO Saphirus", 2)
 *
 * Un mismo vendedor puede tener múltiples entradas:
 *   "MATEO 7"        → MATEO, 7%
 *   "MATEO 10"       → MATEO, 10%
 *   "MATEO Saphirus" → MATEO, 2% (comisión especial marca Saphirus)
 *
 * El sistema crea UN vendedor por nombre base con la comisión más alta
 * como default. Las comisiones específicas por cliente se configuran
 * manualmente en /admin/salespersons.
 *
 * Uso:
 *   npm run import:salespersons -- "C:/ruta/exportacion (1).xlsx"
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

// ── Extraer nombre base removiendo sufijos de comisión ─────────────────────
function extractBaseName(raw: string): string {
  return raw
    .trim()
    // Quitar sufijos de tipo: "SAPHIRUS 2", "SAPHIRUS", "SAPHIRUS CARREFOUR"
    .replace(/\s+SAPHIRUS(\s+CARREFOUR)?(\s+\d+)?$/i, "")
    // Quitar "CON TRASLADO" al final
    .replace(/\s+CON\s+TRASLADO$/i, "")
    // Quitar "MAS 120" o similar
    .replace(/\s+MAS\s+\d+$/i, "")
    // Quitar "VENDEDORA" al final
    .replace(/\s+VENDEDORA$/i, "")
    // Quitar número solo al final (ej. "MATEO 7" → "MATEO", pero no "MAXI GALLARDO")
    .replace(/\s+\d+(\.\d+)?$/, "")
    .trim();
}

// ── Reglas de normalización especiales ────────────────────────────────────
// Para agrupar entradas que son el mismo vendedor con nombres ligeramente distintos.
// clave = nombre base extraído → valor = nombre canónico
const NAME_OVERRIDES: Record<string, string> = {
  // Variantes de NICO (NICO JUSTIN con comisión 0 = sin comisión asignada)
  "NICO JUSTIN": "NICO",
  // CARLI Y ARA y CARLOS Y ARA son el mismo grupo
  "CARLOS Y ARA": "CARLI Y ARA",
  // SEBA y SEBA RIPOLL son el mismo
  "SEBA RIPOLL": "SEBA",
  // LUCAS y LUCAS GARCIA son el mismo
  "LUCAS GARCIA": "LUCAS",
  // Normalizar case para los que tienen mayúscula/minúscula mixta
};

function canonicalName(baseName: string): string {
  const upper = baseName.toUpperCase();
  // Check overrides (case-insensitive key match)
  for (const [key, val] of Object.entries(NAME_OVERRIDES)) {
    if (upper === key.toUpperCase()) return val;
  }
  // Capitalize first letter of each word for readability
  return baseName.replace(/\b\w/g, (c) => c.toUpperCase());
}

async function importSalespersons(excelPath: string) {
  if (!fs.existsSync(excelPath)) {
    console.error(`❌ Archivo no encontrado: ${excelPath}`);
    process.exit(1);
  }

  console.log(`\n📊 Leyendo Excel de vendedores: ${excelPath}\n`);

  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (string | number)[][];

  // Datos reales: saltar fila 0 (header sipe), 1 (vacía), 2 (col names), 3 (fila vacía)
  const dataRows = rows.slice(4).filter((row) => {
    const name = String(row[0] ?? "").trim();
    return name !== "" && name !== "Nombre";
  });

  console.log(`📋 ${dataRows.length} entradas encontradas en el Excel\n`);

  // ── Agrupar por nombre canónico (case-insensitive) ─────────────────────
  // Map key = UPPERCASE para agrupar, value incluye display name preferido
  const groups = new Map<string, { displayName: string; originalNames: string[]; commissions: number[] }>();

  for (const row of dataRows) {
    const rawName    = String(row[0] ?? "").trim();
    const commission = parseFloat(String(row[1] ?? "0")) || 0;

    const base      = extractBaseName(rawName);
    const canonical = canonicalName(base);
    const key       = canonical.toUpperCase(); // case-insensitive grouping key

    if (!groups.has(key)) {
      groups.set(key, { displayName: canonical, originalNames: [], commissions: [] });
    }
    const g = groups.get(key)!;
    // Prefer the first name encountered as display name (usually shortest/cleanest)
    g.originalNames.push(rawName);
    g.commissions.push(commission);
  }

  console.log(`👤 ${groups.size} vendedores únicos identificados:\n`);

  // ── Mostrar agrupaciones para transparencia ─────────────────────────────
  for (const [, g] of groups.entries()) {
    const positiveComms = g.commissions.filter((c) => c > 0);
    const maxComm = positiveComms.length > 0 ? Math.max(...positiveComms) : g.commissions[0] ?? 0;
    const commsStr = g.commissions.map((c, i) => `${c}% (${g.originalNames[i]})`).join(" | ");
    console.log(`  📌 ${g.displayName}`);
    console.log(`     Entradas: ${commsStr}`);
    console.log(`     Default:  ${maxComm}%\n`);
  }

  // ── Importar a la base de datos ─────────────────────────────────────────
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const [, g] of groups.entries()) {
    const { displayName } = g;
    const positiveComms = g.commissions.filter((c) => c > 0);
    const defaultCommission = positiveComms.length > 0
      ? Math.max(...positiveComms)
      : g.commissions[0] ?? 0;

    try {
      const existing = await prisma.salesperson.findFirst({
        where: { name: { equals: displayName, mode: "insensitive" } },
      });

      if (existing) {
        // Only update commission if the new max is higher than current
        const newCommission = Math.max(existing.defaultCommission, defaultCommission);
        await prisma.salesperson.update({
          where: { id: existing.id },
          data: { defaultCommission: newCommission },
        });
        console.log(`  🔄 Actualizado: ${displayName} → ${newCommission}%`);
        updated++;
      } else {
        await prisma.salesperson.create({
          data: {
            name: displayName,
            defaultCommission,
            status: "active",
          },
        });
        console.log(`  ✅ Creado:     ${displayName} → ${defaultCommission}%`);
        created++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ❌ Error con ${displayName}: ${msg}`);
      errors.push(`${displayName}: ${msg}`);
    }
  }

  // ── Reporte final ───────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(52));
  console.log("📊 REPORTE DE IMPORTACIÓN DE VENDEDORES");
  console.log("═".repeat(52));
  console.log(`  ✅ Creados:      ${created}`);
  console.log(`  🔄 Actualizados: ${updated}`);
  console.log(`  ❌ Errores:      ${errors.length}`);
  console.log("═".repeat(52));
  console.log(`
NOTA: Las diferentes comisiones por vendedor (ej. 7% regular, 2% Saphirus)
se configuran por cliente desde el panel /salespersons → Ver → Asignar Cliente.
La comisión "default" importada es la más alta del vendedor.
`);

  // Guardar reporte
  const reportPath = path.join(process.cwd(), "outputs", "import-salespersons-report.json");
  if (!fs.existsSync(path.dirname(reportPath))) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  }
  const report = {
    timestamp: new Date().toISOString(),
    created,
    updated,
    errors,
    groups: Object.fromEntries(
      Array.from(groups.entries()).map(([, g]) => [g.displayName, {
        originalNames: g.originalNames,
        commissions:   g.commissions,
      }])
    ),
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Reporte guardado en: ${reportPath}\n`);

  await prisma.$disconnect();
  await pool.end();
}

const excelPath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.join(process.cwd(), "exportacion.xlsx");

importSalespersons(excelPath).catch((e) => {
  console.error(e);
  process.exit(1);
});
