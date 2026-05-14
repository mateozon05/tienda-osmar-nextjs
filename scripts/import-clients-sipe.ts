/**
 * import-clients-sipe.ts
 * ──────────────────────
 * Importa clientes desde un Excel de SIPE a la base de datos.
 * Contraseña inicial = número de cliente (el cliente puede cambiarla).
 *
 * Uso:
 *   npm run import:clients -- clientes-sipe.xlsx
 *   npm run import:clients -- "C:/ruta/al/archivo.xlsx"
 *
 * Si no se pasa ruta, busca "clientes-sipe.xlsx" en la raíz del proyecto.
 *
 * Columnas esperadas del Excel (acepta variantes):
 *   Código / Cod / ID         → clientCode
 *   Nombre / Razón Social     → name
 *   Empresa / Razón Social    → company
 *   Email / Mail              → email
 *   Teléfono / Tel / Telefono → phone
 *   Dirección / Direccion     → address
 *   Ciudad / Localidad        → city
 *   CUIT / DNI                → taxId
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { Pool } from "pg";
import * as bcrypt from "bcryptjs";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as never);

// ── Helpers para leer columnas con nombres alternativos ────────────────────
function col(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") {
      return String(row[k]).trim();
    }
  }
  return "";
}

function colOrNull(row: Record<string, unknown>, ...keys: string[]): string | null {
  const v = col(row, ...keys);
  return v || null;
}

interface ImportError {
  row: Record<string, unknown>;
  error: string;
}

async function importClients(excelPath: string) {
  if (!fs.existsSync(excelPath)) {
    console.error(`❌ Archivo no encontrado: ${excelPath}`);
    process.exit(1);
  }

  console.log(`\n📊 Leyendo Excel: ${excelPath}\n`);
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Leer primera fila para detectar formato
  const probe = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
  const firstKey = probe.length > 0 ? Object.keys(probe[0])[0] : "";

  // ── Detectar formato SIPE (merged cells en encabezado) ────────────────────
  // El Excel de SIPE exportado tiene:
  //   Filas 1-4: info de SIPE (junk) — col A tiene "Cliente: "
  //   Fila 5:    labels reales (ID, Codigo, Razón Social...) bajo merged cells
  //   Fila 6+:   datos reales
  // Se detecta si col A es "Cliente: " o "Clientes"
  const isSipeFormat = firstKey === "Cliente: " || firstKey === "Clientes" || firstKey.startsWith("Cliente");

  // Leer con el range correcto según el formato
  const rows = isSipeFormat
    ? (XLSX.utils.sheet_to_json(sheet, { range: 4 }) as Record<string, unknown>[])
    : probe;

  console.log(`📋 Hoja: "${sheetName}" — ${rows.length} filas`);

  let processedRows: Record<string, unknown>[] = [];

  if (isSipeFormat) {
    console.log("📌 Formato SIPE detectado (merged cells). Mapeando por posición…");
    // Saltar fila 0 que contiene los labels (ID, Codigo, Razón Social...)
    processedRows = rows.slice(1).map((r) => ({
      clientCode: String((r as Record<string, unknown>)["__EMPTY"]         ?? "").trim(),
      name:       String((r as Record<string, unknown>)["__EMPTY_1"]       ?? "").trim(),
      taxId:      String((r as Record<string, unknown>)["__EMPTY_2"]       ?? "").trim() || null,
      company:    String((r as Record<string, unknown>)["__EMPTY_3"]       ?? "").trim() || null,
      phone:      String((r as Record<string, unknown>)["__EMPTY_6"]       ?? "").trim() || null,
      address:    String((r as Record<string, unknown>)["__EMPTY_7"]       ?? "").trim() || null,
      city:       String((r as Record<string, unknown>)["__EMPTY_8"]       ?? "").trim() || null,
      email:      null,
    }));
  } else {
    // Formato genérico: columnas con nombres estándar
    console.log(`📌 Columnas detectadas: ${Object.keys(rows[0]).join(", ")}\n`);
    processedRows = rows.map((r) => {
      const emailRaw = col(r, "Email", "email", "EMAIL", "Mail", "MAIL", "E-mail");
      return {
        clientCode: col(r, "Código", "Codigo", "codigo", "ID", "Nro"),
        name:       col(r, "Nombre", "nombre", "Razón Social", "Razon Social"),
        company:    colOrNull(r, "Empresa", "empresa", "Razón Social", "Razon Social"),
        email:      emailRaw.toLowerCase() || null,
        phone:      colOrNull(r, "Teléfono", "Telefono", "telefono", "Tel", "Celular"),
        address:    colOrNull(r, "Dirección", "Direccion", "direccion", "Domicilio"),
        city:       colOrNull(r, "Ciudad", "ciudad", "Localidad", "localidad"),
        taxId:      colOrNull(r, "CUIT", "cuit", "DNI", "dni"),
      };
    });
  }

  console.log(`📦 ${processedRows.length} clientes a procesar\n`);
  const results = { created: 0, updated: 0, skipped: 0, errors: [] as ImportError[] };

  for (let i = 0; i < processedRows.length; i++) {
    const row = processedRows[i] as Record<string, unknown>;

    const clientCode = String(row.clientCode ?? "").trim();
    const name       = String(row.name ?? "").trim();

    if (!clientCode || !name) {
      results.skipped++;
      continue;
    }

    const emailVal = row.email ? String(row.email).toLowerCase() : null;

    const data = {
      clientCode,
      name,
      company: (row.company as string | null) ?? null,
      email:   emailVal,
      phone:   (row.phone as string | null)   ?? null,
      address: (row.address as string | null) ?? null,
      city:    (row.city as string | null)    ?? null,
      taxId:   (row.taxId as string | null)   ?? null,
    };

    try {
      // Buscar existente por clientCode o email
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { clientCode },
            ...(emailVal ? [{ email: emailVal }] : []),
          ],
        },
      });

      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            clientCode: data.clientCode,
            name:       data.name,
            company:    data.company ?? existing.company,
            phone:      data.phone   ?? existing.phone,
            address:    data.address ?? existing.address,
            city:       data.city    ?? existing.city,
            taxId:      data.taxId   ?? existing.taxId,
            ...(data.email ? { email: data.email } : {}),
          },
        });
        console.log(`  🔄 Actualizado: [${clientCode}] ${name}`);
        results.updated++;
      } else {
        // Contraseña inicial = número de cliente
        const password = await bcrypt.hash(clientCode, 10);
        await prisma.user.create({
          data: {
            clientCode:  data.clientCode,
            name:        data.name,
            company:     data.company,
            email:       data.email,
            phone:       data.phone,
            address:     data.address,
            city:        data.city,
            taxId:       data.taxId,
            password,
            role:        "customer",
            status:      "approved", // Ya son clientes activos de SIPE
          },
        });
        console.log(`  ✅ Creado:     [${clientCode}] ${name}`);
        results.created++;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ❌ Error fila ${i + 2} [${clientCode}]: ${msg}`);
      results.errors.push({ row, error: msg });
    }
  }

  // ── Reporte ────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(52));
  console.log("📊 REPORTE DE IMPORTACIÓN");
  console.log("═".repeat(52));
  console.log(`  ✅ Creados:      ${results.created}`);
  console.log(`  🔄 Actualizados: ${results.updated}`);
  console.log(`  ⚠️  Saltados:     ${results.skipped}`);
  console.log(`  ❌ Errores:      ${results.errors.length}`);
  console.log("═".repeat(52));
  console.log("\n🔑 Contraseña inicial = número de cliente");
  console.log("   Ej: cliente 1254 → contraseña '1254'");
  console.log("   Los clientes pueden cambiarla desde su perfil.\n");

  // Guardar reporte JSON
  const reportPath = path.join(process.cwd(), "outputs", "import-clients-report.json");
  if (!fs.existsSync(path.dirname(reportPath))) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  }
  fs.writeFileSync(reportPath, JSON.stringify({ ...results, timestamp: new Date().toISOString() }, null, 2));
  console.log(`📄 Reporte guardado en: ${reportPath}\n`);

  await prisma.$disconnect();
}

const excelPath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.join(process.cwd(), "clientes-sipe.xlsx");

importClients(excelPath).catch((e) => {
  console.error(e);
  process.exit(1);
});
