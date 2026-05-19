import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page   = Math.max(1, parseInt(searchParams.get("page")   ?? "1"));
  const limit  = Math.min(200, parseInt(searchParams.get("limit")  ?? "100"));
  const action = searchParams.get("action") ?? "";
  const search = searchParams.get("q")      ?? "";

  const where = {
    ...(action ? { action } : {}),
    ...(search ? {
      OR: [
        { userName: { contains: search, mode: "insensitive" as const } },
        { action:   { contains: search, mode: "insensitive" as const } },
        { ip:       { contains: search } },
      ],
    } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, page, limit, totalPages: Math.ceil(total / limit) });
}
