import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { products: { where: { active: true } } } },
    },
  });

  const res = NextResponse.json(categories);
  // Las categorías cambian poco: cachear 1 hora en CDN, revalidar en background
  res.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=300");
  return res;
}
