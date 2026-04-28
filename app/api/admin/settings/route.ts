import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULTS: Record<string, string> = {
  store_name: "Distribuidora Osmar",
  store_phone: "",
  store_email: "",
  store_address: "Tigre, Buenos Aires",
  store_hours: "Lunes a Viernes 9:00–18:00",
  store_whatsapp: "",
  mp_dashboard_url: "https://www.mercadopago.com.ar/activities",
};

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const rows = await prisma.setting.findMany();
  const settings = { ...DEFAULTS };
  for (const row of rows) {
    settings[row.key] = row.value;
  }

  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { settings } = await req.json();
  const validKeys = Object.keys(DEFAULTS);

  for (const [key, value] of Object.entries(settings)) {
    if (!validKeys.includes(key)) continue;
    await prisma.setting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
  }

  return NextResponse.json({ success: true });
}
