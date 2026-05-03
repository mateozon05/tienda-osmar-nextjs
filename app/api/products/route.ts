import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q        = searchParams.get("q")        ?? "";
  const category = searchParams.get("category") ?? "";
  const sort     = searchParams.get("sort")     ?? "name";
  const page     = parseInt(searchParams.get("page")  ?? "1");
  const limit    = parseInt(searchParams.get("limit") ?? "48");
  const minPrice = parseFloat(searchParams.get("minPrice") ?? "0");
  const maxPrice = parseFloat(searchParams.get("maxPrice") ?? "0"); // 0 = no upper bound
  const inStock  = searchParams.get("inStock") === "true";

  // Build price filter
  const priceFilter: { gte?: number; lte?: number } = {};
  if (minPrice > 0)  priceFilter.gte = minPrice;
  if (maxPrice > 0)  priceFilter.lte = maxPrice;

  const where = {
    active: true,
    ...(Object.keys(priceFilter).length > 0 && { price: priceFilter }),
    ...(inStock && { stock: { gt: 0 } }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { code: { contains: q, mode: "insensitive" as const } },
      ],
    }),
    ...(category && category !== "todos" && {
      category: { slug: category },
    }),
  };

  const orderBy =
    sort === "price_asc"  ? { price: "asc"  as const } :
    sort === "price_desc" ? { price: "desc" as const } :
    { name: "asc" as const };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: { category: true },
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({ products, total, page, limit });
}
