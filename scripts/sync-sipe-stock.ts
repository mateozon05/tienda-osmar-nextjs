/**
 * sync-sipe-stock.ts
 * Sincroniza el stock desde un Excel exportado de SIPE hacia la BD.
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/sync-sipe-stock.ts [ruta-excel]
 *   npm run sync:sipe -- exportacion.xlsx
 *
 * Formato Excel esperado (datos desde fila 7):
 *   Col 0: Código de producto   (ej: 11989)
 *   Col 1: Código de barras     (opcional)
 *   Col 2: Nombre del producto
 *   Col 3: Stock disponible
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

process.stdout.setEncoding?.("utf-8");

const pool    = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma  = new PrismaClient({ adapter });

// ─── Types ───────────────────────────────────────────────────────────────────

interface SipeRow {
  codigo:       string;
  codigoBarras: string | null;
  nombre:       string;
  stock:        number;
}

interface SyncResult {
  actualizados:    Array<{ codigo: string; nombre: string; stockAnterior: number; stockNuevo: number }>;
  sinCambios:      Array<{ codigo: string; nombre: string; stock: number }>;
  noEncontrados:   Array<{ codigo: string; nombre: string; stock: number }>;
  errores:         Array<{ codigo: string; error: string }>;
}

// ─── Leer Excel ──────────────────────────────────────────────────────────────

function readSipeExcel(filePath: string): SipeRow[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Archivo no encontrado: ${filePath}`);
  }

  console.log(`\n📂 Leyendo: ${path.resolve(filePath)}`);
  const workbook = XLSX.readFile(filePath);
  const sheet    = workbook.Sheets[workbook.SheetNames[0]];
  const rows     = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown[][];

  console.log(`   Hoja: "${workbook.SheetNames[0]}" — ${rows.length} filas totales`);

  // Buscar la fila de encabezados dinámicamente (contiene "codigo" o "Codigo")
  let startRow = 6; // default: fila 7 (índice 6)
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const row = rows[i] as string[];
    const cellText = String(row[0] ?? "").toLowerCase();
    if (cellText.includes("codigo") || cellText.includes("código")) {
      startRow = i + 1; // datos empiezan después del encabezado
      console.log(`   Encabezado detectado en fila ${i + 1}, datos desde fila ${startRow + 1}`);
      break;
    }
  }

  const productos: SipeRow[] = [];
  for (const row of rows.slice(startRow)) {
    const rawRow = row as unknown[];
    const codigo = String(rawRow[0] ?? "").trim();
    const nombre = String(rawRow[2] ?? "").trim();

    // Saltar filas vacías o con datos inválidos
    if (!codigo || !nombre || codigo === "" || nombre === "") continue;
    if (codigo.toLowerCase().includes("codigo") || codigo.toLowerCase().includes("total")) continue;

    const stock = parseInt(String(rawRow[3] ?? "0").trim()) || 0;

    productos.push({
      codigo,
      codigoBarras: rawRow[1] ? String(rawRow[1]).trim() : null,
      nombre,
      stock: Math.max(0, stock),
    });
  }

  return productos;
}

// ─── Sincronizar ─────────────────────────────────────────────────────────────

async function syncSipeStock(excelPath: string): Promise<void> {
  const productos = readSipeExcel(excelPath);
  console.log(`\n📊 ${productos.length} productos leídos de SIPE\n`);

  const result: SyncResult = {
    actualizados:  [],
    sinCambios:    [],
    noEncontrados: [],
    errores:       [],
  };

  const total = productos.length;
  let processed = 0;

  for (const prod of productos) {
    processed++;
    if (processed % 100 === 0) {
      process.stdout.write(`   [${processed}/${total}] procesados...\r`);
    }

    try {
      const existente = await prisma.product.findFirst({
        where: { code: prod.codigo },
        select: { id: true, name: true, stock: true },
      });

      if (existente) {
        if (existente.stock === prod.stock) {
          result.sinCambios.push({
            codigo: prod.codigo,
            nombre: existente.name,
            stock:  prod.stock,
          });
        } else {
          await prisma.product.update({
            where: { id: existente.id },
            data:  { stock: prod.stock },
          });
          result.actualizados.push({
            codigo:        prod.codigo,
            nombre:        existente.name,
            stockAnterior: existente.stock,
            stockNuevo:    prod.stock,
          });
        }
      } else {
        result.noEncontrados.push({
          codigo: prod.codigo,
          nombre: prod.nombre,
          stock:  prod.stock,
        });
      }
    } catch (err) {
      result.errores.push({
        codigo: prod.codigo,
        error:  err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ─── Reporte ───────────────────────────────────────────────────────────────

  console.log("\n");
  console.log("═".repeat(60));
  console.log("📊 REPORTE DE SINCRONIZACIÓN SIPE");
  console.log("═".repeat(60));
  console.log(`  ✅ Stock actualizado:  ${result.actualizados.length}`);
  console.log(`  🔄 Sin cambios:        ${result.sinCambios.length}`);
  console.log(`  ❓ No encontrados:     ${result.noEncontrados.length}`);
  console.log(`  ❌ Errores:            ${result.errores.length}`);
  console.log("═".repeat(60));

  if (result.actualizados.length > 0) {
    console.log("\n📦 Muestra de actualizaciones (primeras 10):");
    result.actualizados.slice(0, 10).forEach(p => {
      console.log(`   [${p.codigo}] ${p.nombre.slice(0, 40).padEnd(40)} ${p.stockAnterior} → ${p.stockNuevo}`);
    });
  }

  if (result.noEncontrados.length > 0) {
    console.log(`\n❓ Productos de SIPE no encontrados en tienda (${result.noEncontrados.length}):`);
    result.noEncontrados.slice(0, 20).forEach(p => {
      console.log(`   [${p.codigo}] ${p.nombre.slice(0, 50)}`);
    });
    if (result.noEncontrados.length > 20) {
      console.log(`   ... y ${result.noEncontrados.length - 20} más (ver reporte JSON)`);
    }
  }

  if (result.errores.length > 0) {
    console.log("\n❌ Errores:");
    result.errores.forEach(e => console.log(`   [${e.codigo}] ${e.error}`));
  }

  // Guardar reporte completo
  const reportPath = path.join(path.dirname(excelPath), "sipe-sync-report.json");
  fs.writeFileSync(reportPath, JSON.stringify({
    fecha:     new Date().toISOString(),
    archivo:   path.resolve(excelPath),
    resumen: {
      total:          productos.length,
      actualizados:   result.actualizados.length,
      sinCambios:     result.sinCambios.length,
      noEncontrados:  result.noEncontrados.length,
      errores:        result.errores.length,
    },
    detalles: result,
  }, null, 2), "utf-8");

  console.log(`\n📄 Reporte guardado: ${reportPath}`);
  console.log("\n✅ Sincronización completada\n");
}

// ─── Main ────────────────────────────────────────────────────────────────────

const excelPath = process.argv[2] || "exportacion.xlsx";

syncSipeStock(excelPath)
  .catch((err) => {
    console.error("\n❌ Error fatal:", err.message);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
