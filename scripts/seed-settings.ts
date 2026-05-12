import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as never);

const defaults = [
  // Empresa
  { key: "company_name",      value: "Distribuidora Osmar" },
  { key: "company_address",   value: "Avenida Cazón 464, Tigre, Buenos Aires" },
  { key: "company_phone",     value: "+54 9 11 5017-9447" },
  { key: "company_email",     value: "ventas@distribuidoraosmar.com" },
  { key: "company_founded",   value: "1983" },
  { key: "company_cuit",      value: "" },
  // Banco
  { key: "bank_name",         value: "" },
  { key: "bank_holder",       value: "Distribuidora Osmar" },
  { key: "bank_cbu",          value: "" },
  { key: "bank_alias",        value: "" },
  { key: "bank_cuit",         value: "" },
  // Métodos de pago
  { key: "payment_efectivo",      value: "true" },
  { key: "payment_transferencia", value: "true" },
  { key: "payment_mercadopago",   value: "true" },
  // Horarios
  { key: "hours_weekday",     value: "8:00 - 12:00 / 13:00 - 18:00" },
  { key: "hours_saturday",    value: "9:00 - 13:00" },
  { key: "hours_sunday",      value: "Cerrado" },
  // Redes sociales
  { key: "social_instagram",  value: "https://www.instagram.com/distri_osmar/" },
  { key: "social_facebook",   value: "https://www.facebook.com/distribuidoraosmarlimpieza" },
  { key: "social_whatsapp",   value: "541150179447" },
  // Textos
  { key: "store_welcome_msg", value: "Bienvenido a Distribuidora Osmar" },
  { key: "store_tagline",     value: "Productos de limpieza mayorista desde 1983" },
  { key: "store_prices_note", value: "Los precios no incluyen IVA" },
];

async function main() {
  console.log("🌱 Seeding settings…");
  let created = 0;
  let skipped = 0;

  for (const { key, value } of defaults) {
    const existing = await (prisma as any).setting.findUnique({ where: { key } });
    if (!existing) {
      await (prisma as any).setting.create({ data: { key, value } });
      console.log(`  ✅ ${key}`);
      created++;
    } else {
      console.log(`  ⏭️  ${key} (ya existe)`);
      skipped++;
    }
  }

  console.log(`\n✅ Seed completo: ${created} creadas, ${skipped} omitidas`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => pool.end());
