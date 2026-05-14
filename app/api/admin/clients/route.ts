import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q       = searchParams.get("q")        ?? "";
  const status  = searchParams.get("status")   ?? "";
  const page    = parseInt(searchParams.get("page")  ?? "1");
  const limit   = parseInt(searchParams.get("limit") ?? "50");

  const where = {
    role: "customer",
    ...(status && { status }),
    ...(q && {
      OR: [
        { name:       { contains: q, mode: "insensitive" as const } },
        { clientCode: { contains: q, mode: "insensitive" as const } },
        { company:    { contains: q, mode: "insensitive" as const } },
        { email:      { contains: q, mode: "insensitive" as const } },
        { city:       { contains: q, mode: "insensitive" as const } },
      ],
    }),
  };

  const [clients, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ clientCode: "asc" }, { name: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, clientCode: true, name: true, company: true,
        email: true, phone: true, city: true, taxId: true, address: true,
        status: true, role: true, lastLogin: true, createdAt: true,
        priceList:   { select: { id: true, name: true } },
        salesperson: { select: { id: true, name: true } },
        _count: { select: { orders: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ clients, total, page, limit });
}
