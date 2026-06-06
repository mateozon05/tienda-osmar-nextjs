import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1"));
  const limit  = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const role   = searchParams.get("role")   ?? "";   // "customer" | "admin" | ""

  const where = {
    ...(role   ? { role }   : { role: { in: ["customer", "admin", "superadmin"] } }),
    ...(status ? { status } : {}),
    ...(search ? {
      OR: [
        { name:       { contains: search, mode: "insensitive" as const } },
        { email:      { contains: search, mode: "insensitive" as const } },
        { clientCode: { contains: search, mode: "insensitive" as const } },
        { company:    { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, clientCode: true,
        company: true, phone: true, role: true, status: true,
        lastLogin: true, createdAt: true,
        priceList:         { select: { id: true, name: true, type: true, discountPercentage: true } },
        saphirusPriceList: { select: { id: true, name: true, type: true } },
        salesperson:       { select: { id: true, name: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],   // pending first
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, limit, totalPages: Math.ceil(total / limit) });
}
