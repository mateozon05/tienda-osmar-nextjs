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

  const userId = parseInt(params.id);
  if (isNaN(userId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const body = await req.json();
  const { status, priceListId } = body as {
    status?: "pending" | "approved" | "rejected";
    priceListId?: number | null;
  };

  const data: Record<string, unknown> = {};
  if (status !== undefined) data.status = status;
  if (priceListId !== undefined) data.priceListId = priceListId;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true, name: true, email: true, status: true,
      priceList: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ user });
}
