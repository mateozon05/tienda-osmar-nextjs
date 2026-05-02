import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = parseInt(params.id);
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if ("bulkUnit"  in body) data.bulkUnit  = body.bulkUnit  || null;
  if ("bulkSize"  in body) data.bulkSize  = body.bulkSize  ? parseInt(body.bulkSize)    : null;
  if ("bulkPrice" in body) data.bulkPrice = body.bulkPrice ? parseFloat(body.bulkPrice) : null;
  if ("unitPrice" in body) data.unitPrice = body.unitPrice ? parseFloat(body.unitPrice) : null;
  if ("active"    in body) data.active    = Boolean(body.active);

  const product = await prisma.product.update({ where: { id }, data });
  return NextResponse.json(product);
}
