import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public settings: only exposes non-sensitive store config
const PUBLIC_KEYS = ["bank_name", "bank_account_owner", "bank_cbu", "bank_alias", "bank_cuit", "store_whatsapp"];

export async function GET() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: PUBLIC_KEYS } },
  });
  const settings: Record<string, string> = {};
  for (const key of PUBLIC_KEYS) settings[key] = "";
  for (const row of rows) settings[row.key] = row.value;

  const res = NextResponse.json({ settings });
  res.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=60");
  return res;
}
