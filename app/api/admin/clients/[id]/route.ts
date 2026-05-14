import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = parseInt(id);
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if ("status"      in body) data.status      = body.status;
  if ("priceListId" in body) data.priceListId = body.priceListId ? parseInt(body.priceListId) : null;
  if ("name"        in body) data.name        = body.name;
  if ("company"     in body) data.company     = body.company     || null;
  if ("phone"       in body) data.phone       = body.phone       || null;
  if ("address"     in body) data.address     = body.address     || null;
  if ("city"        in body) data.city        = body.city        || null;
  if ("taxId"       in body) data.taxId       = body.taxId       || null;

  const updated = await prisma.user.update({ where: { id: userId }, data });
  return NextResponse.json(updated);
}
