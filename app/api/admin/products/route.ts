import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q        = searchParams.get("q")        ?? "";
  const category = searchParams.get("category") ?? "";
  const status   = searchParams.get("status")   ?? "active"; // "all" | "active" | "inactive"
  const noImage  = searchParams.get("noImage")  === "true";
  const page     = parseInt(searchParams.get("page")  ?? "1");
  const limit    = parseInt(searchParams.get("limit") ?? "50");

  // Condiciones base
  const where: Record<string, unknown> = {};
  if (status === "active")   where.active = true;
  if (status === "inactive") where.active = false;
  if (category)              where.category = { slug: category };

  // Condiciones OR compuestas con AND para evitar solapamiento
  const andConditions: Record<string, unknown>[] = [];
  if (q) andConditions.push({
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { code: { contains: q, mode: "insensitive" } },
    ],
  });
  if (noImage) andConditions.push({
    OR: [{ imageUrl: null }, { imageUrl: "" }],
  });
  if (andConditions.length) where.AND = andConditions;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, code: true, name: true, price: true, active: true,
        imageUrl: true,
        bulkUnit: true, bulkSize: true, bulkPrice: true, unitPrice: true,
        category: { select: { name: true, slug: true, emoji: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({ products, total, page, limit });
}
