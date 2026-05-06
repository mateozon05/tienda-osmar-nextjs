import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { notifyUserApproved, notifyUserRejected } from "@/lib/email";

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

  // Audit + email notifications (fire-and-forget)
  const auditPromises: Promise<unknown>[] = [];

  if (status === "approved") {
    auditPromises.push(
      audit({
        action:   "USER_APPROVED",
        entity:   "User",
        entityId: userId,
        userId:   session.userId,
        userName: session.email,
        details:  { targetUser: user.name, targetEmail: user.email, priceList: user.priceList?.name },
      }),
      notifyUserApproved({
        name:          user.name,
        email:         user.email,
        priceListName: user.priceList?.name ?? "Público General",
      })
    );
  } else if (status === "rejected") {
    auditPromises.push(
      audit({
        action:   "USER_REJECTED",
        entity:   "User",
        entityId: userId,
        userId:   session.userId,
        userName: session.email,
        details:  { targetUser: user.name, targetEmail: user.email },
      }),
      notifyUserRejected({ name: user.name, email: user.email })
    );
  } else if (priceListId !== undefined) {
    auditPromises.push(
      audit({
        action:   "USER_PRICE_LIST_CHANGED",
        entity:   "User",
        entityId: userId,
        userId:   session.userId,
        userName: session.email,
        details:  { targetUser: user.name, newPriceList: user.priceList?.name ?? null },
      })
    );
  }

  await Promise.all(auditPromises);

  return NextResponse.json({ user });
}
