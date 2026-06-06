import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// ── Apply price list discount to a product ──────────────
function applyPrices(
  product: {
    price: number;
    unitPrice: number | null;
    bulkPrice: number | null;
    isSaphirus?: boolean;
    productPrices?: Array<{ customPrice: number | null; customBulkPrice: number | null; priceListId: number }>;
    [key: string]: unknown;
  },
  discountPct: number | null | undefined,
): typeof product {
  // 1. Check for custom fixed price override (from any matched price list)
  const custom = product.productPrices?.[0];
  if (custom) {
    return {
      ...product,
      price:     custom.customPrice     ?? product.price,
      unitPrice: custom.customPrice     ?? product.unitPrice,
      bulkPrice: custom.customBulkPrice ?? product.bulkPrice,
    };
  }

  // 2. Apply discount %
  if (discountPct && discountPct > 0) {
    const mult = 1 - discountPct / 100;
    return {
      ...product,
      originalPrice:      product.price,
      discountPercentage: discountPct,
      price:     Math.round(product.price * mult),
      unitPrice: product.unitPrice ? Math.round(product.unitPrice * mult) : product.unitPrice,
      bulkPrice: product.bulkPrice ? Math.round(product.bulkPrice * mult) : product.bulkPrice,
    };
  }

  return { ...product, originalPrice: null, discountPercentage: 0 };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q        = searchParams.get("q")        ?? "";
  const category = searchParams.get("category") ?? "";
  const sort     = searchParams.get("sort")     ?? "name";
  const page     = parseInt(searchParams.get("page")  ?? "1");
  const limit    = parseInt(searchParams.get("limit") ?? "48");
  const minPrice = parseFloat(searchParams.get("minPrice") ?? "0");
  const maxPrice = parseFloat(searchParams.get("maxPrice") ?? "0");
  const inStock  = searchParams.get("inStock") === "true";

  // ── Resolve price list for current user ──────────────
  let priceListId: number | null = null;
  let saphirusPriceListId: number | null = null;
  let discountPct: number | null = null;

  const session = await getSession();
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        status: true,
        priceList:         { select: { id: true, discountPercentage: true } },
        saphirusPriceList: { select: { id: true } },
      },
    });
    if (user?.status === "approved") {
      if (user.priceList) {
        priceListId = user.priceList.id;
        discountPct = user.priceList.discountPercentage ?? null;
      }
      if (user.saphirusPriceList) {
        saphirusPriceListId = user.saphirusPriceList.id;
      }
    }
  }

  // ── Build Prisma where ────────────────────────────────
  const priceFilter: { gte?: number; lte?: number } = {};
  if (minPrice > 0) priceFilter.gte = minPrice;
  if (maxPrice > 0) priceFilter.lte = maxPrice;

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
    ...(category && category !== "todos" && { category: { slug: category } }),
  };

  const orderBy =
    sort === "price_asc"  ? { price: "asc"  as const } :
    sort === "price_desc" ? { price: "desc" as const } :
    { name: "asc" as const };

  const hasPersonalPrices = priceListId !== null || saphirusPriceListId !== null;

  const [rawProducts, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        category: true,
        // Include product prices for both lists; each product only has prices for
        // its own type (general or Saphirus), so we filter by both and let
        // applyPrices pick the first match.
        ...(hasPersonalPrices && {
          productPrices: {
            where: {
              OR: [
                ...(priceListId         ? [{ priceListId }]         : []),
                ...(saphirusPriceListId ? [{ priceListId: saphirusPriceListId }] : []),
              ],
            },
          },
        }),
      },
    }),
    prisma.product.count({ where }),
  ]);

  // Apply personalized prices — for each product, only the matching list price
  // will be present in productPrices (general products have no Saphirus price and vice versa)
  const products = rawProducts.map(p => applyPrices(p as Parameters<typeof applyPrices>[0], discountPct));

  const res = NextResponse.json({ products, total, page, limit });

  // Cache-Control: público (guest) o privado (usuario con precio personalizado)
  if (session && hasPersonalPrices) {
    res.headers.set("Cache-Control", "private, no-cache");
  } else {
    res.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=60");
  }

  return res;
}
