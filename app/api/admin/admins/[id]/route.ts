import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH — actualizar rol o estado de un admin
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (session?.role !== "superadmin") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr);

  if (id === session.userId) {
    return NextResponse.json(
      { error: "No podés modificar tu propia cuenta desde aquí" },
      { status: 400 }
    );
  }

  const data = await req.json();

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(data.role !== undefined && { role: data.role }),
      ...(data.status !== undefined && { status: data.status }),
    },
    select: {
      id: true, name: true, email: true,
      role: true, status: true,
      lastLogin: true, createdAt: true,
    },
  });

  return NextResponse.json({ success: true, admin: updated });
}
