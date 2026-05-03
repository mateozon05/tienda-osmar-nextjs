import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ products: [], categories: [] });

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { code: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 6,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        price: true,
        unitPrice: true,
        category: { select: { name: true, emoji: true, slug: true } },
      },
    }),
    prisma.category.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 3,
      include: { _count: { select: { products: true } } },
    }),
  ]);

  return NextResponse.json({ products, categories });
}
