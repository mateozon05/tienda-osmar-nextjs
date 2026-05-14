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
  const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

  console.log(`📋 Hoja: "${sheetName}" — ${rows.length} filas`);

  // Mostrar columnas detectadas
  if (rows.length > 0) {
    console.log(`📌 Columnas detectadas: ${Object.keys(rows[0]).join(", ")}\n`);
  }

  const results = { created: 0, updated: 0, skipped: 0, errors: [] as ImportError[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const clientCode = col(row,
      "Código", "Codigo", "codigo", "CODIGO", "Cod", "COD",
      "ID", "id", "Nro", "Numero", "Número", "NRO"
    );
    const name = col(row,
      "Nombre", "nombre", "NOMBRE",
      "Razón Social", "Razon Social", "razon social", "RAZON SOCIAL",
      "RazonSocial"
    );

    if (!clientCode || !name) {
      console.log(`  ⚠️  Fila ${i + 2}: sin código o nombre, saltada`);
      results.skipped++;
      continue;
    }

    const emailRaw = col(row, "Email", "email", "EMAIL", "Mail", "MAIL", "E-mail");
    const emailVal = emailRaw.toLowerCase() || null;

    const data = {
      clientCode,
      name,
      company:  colOrNull(row, "Empresa", "empresa", "EMPRESA", "Razón Social", "Razon Social"),
      email:    emailVal,
      phone:    colOrNull(row, "Teléfono", "Telefono", "telefono", "TELEFONO", "Tel", "TEL", "Celular"),
      address:  colOrNull(row, "Dirección", "Direccion", "direccion", "DIRECCION", "Domicilio"),
      city:     colOrNull(row, "Ciudad", "ciudad", "CIUDAD", "Localidad", "localidad"),
      taxId:    colOrNull(row, "CUIT", "cuit", "Cuit", "DNI", "dni"),
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
