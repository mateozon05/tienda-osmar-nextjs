import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULTS: Record<string, string> = {
  // Empresa
  company_name:      "Distribuidora Osmar",
  company_address:   "Avenida Cazón 464, Tigre, Buenos Aires",
  company_phone:     "+54 9 11 5017-9447",
  company_email:     "ventas@distribuidoraosmar.com",
  company_founded:   "1983",
  company_cuit:      "",
  // Banco
  bank_name:         "",
  bank_holder:       "Distribuidora Osmar",
  bank_cbu:          "",
  bank_alias:        "",
  bank_cuit:         "",
  // Métodos de pago
  payment_efectivo:      "true",
  payment_transferencia: "true",
  payment_mercadopago:   "true",
  // Horarios
  hours_weekday:     "8:00 - 12:00 / 13:00 - 18:00",
  hours_saturday:    "9:00 - 13:00",
  hours_sunday:      "Cerrado",
  // Redes sociales
  social_instagram:  "https://www.instagram.com/distri_osmar/",
  social_facebook:   "https://www.facebook.com/distribuidoraosmarlimpieza",
  social_whatsapp:   "541150179447",
  // Textos de la tienda
  store_welcome_msg: "Bienvenido a Distribuidora Osmar",
  store_tagline:     "Productos de limpieza mayorista desde 1983",
  store_prices_note: "Los precios no incluyen IVA",
};

// GET — obtener todas las settings
export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const rows = await prisma.setting.findMany();
  const settings = { ...DEFAULTS };
  for (const row of rows) {
    settings[row.key] = row.value;
  }

  return NextResponse.json({ settings });
}

// PUT — guardar settings
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { settings } = await req.json();
  const validKeys = Object.keys(DEFAULTS);

  await Promise.all(
    Object.entries(settings as Record<string, string>)
      .filter(([key]) => validKeys.includes(key))
      .map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
  );

  return NextResponse.json({ success: true });
}
