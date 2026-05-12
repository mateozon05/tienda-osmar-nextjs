import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Claves públicas expuestas al frontend (sin datos sensibles internos)
const PUBLIC_KEYS = [
  "company_name", "company_address", "company_phone", "company_email",
  "company_founded",
  "bank_name", "bank_holder", "bank_cbu", "bank_alias", "bank_cuit",
  "payment_efectivo", "payment_transferencia", "payment_mercadopago",
  "hours_weekday", "hours_saturday", "hours_sunday",
  "social_instagram", "social_facebook", "social_whatsapp",
  "store_welcome_msg", "store_tagline", "store_prices_note",
];

const DEFAULTS: Record<string, string> = {
  company_name:      "Distribuidora Osmar",
  company_address:   "Avenida Cazón 464, Tigre, Buenos Aires",
  company_phone:     "+54 9 11 5017-9447",
  company_email:     "ventas@distribuidoraosmar.com",
  company_founded:   "1983",
  bank_name: "", bank_holder: "", bank_cbu: "", bank_alias: "", bank_cuit: "",
  payment_efectivo: "true", payment_transferencia: "true", payment_mercadopago: "true",
  hours_weekday: "8:00 - 12:00 / 13:00 - 18:00",
  hours_saturday: "9:00 - 13:00",
  hours_sunday: "Cerrado",
  social_instagram: "", social_facebook: "", social_whatsapp: "541150179447",
  store_welcome_msg: "Bienvenido a Distribuidora Osmar",
  store_tagline: "Productos de limpieza mayorista desde 1983",
  store_prices_note: "Los precios no incluyen IVA",
};

export async function GET() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: PUBLIC_KEYS } },
  });

  const settings: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) settings[row.key] = row.value;

  const res = NextResponse.json({ settings });
  res.headers.set("Cache-Control", "public, s-maxage=120, stale-while-revalidate=60");
  return res;
}
