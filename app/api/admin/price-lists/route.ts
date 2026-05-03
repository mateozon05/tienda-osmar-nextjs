import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const priceLists = await prisma.priceList.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, discountPercentage: true, isDefault: true },
  });

  return NextResponse.json({ priceLists });
}
