import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true, email: true, name: true, role: true,
      company: true, status: true,
      priceList: { select: { id: true, name: true, discountPercentage: true } },
    },
  });

  if (!user) return NextResponse.json({ user: null }, { status: 404 });
  return NextResponse.json({ user });
}
