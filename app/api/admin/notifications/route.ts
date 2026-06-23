import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const [pendingCount, pending] = await Promise.all([
    prisma.user.count({ where: { status: "pending" } }),
    prisma.user.findMany({
      where:   { status: "pending" },
      select:  { id: true, name: true, email: true, company: true, clientCode: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take:    10,
    }),
  ]);

  return NextResponse.json({ pendingCount, pending });
}
