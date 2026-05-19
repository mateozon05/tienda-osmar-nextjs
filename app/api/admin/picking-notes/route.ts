import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) return null;
  return session;
}

async function generateNumber(): Promise<string> {
  const last = await prisma.pickingNote.findFirst({
    orderBy: { createdAt: "desc" },
    select: { number: true },
  });
  if (!last) return "NP-0001";
  const n = parseInt(last.number.replace("NP-", "")) + 1;
  return `NP-${String(n).padStart(4, "0")}`;
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page   = Math.max(1, parseInt(searchParams.get("page")   ?? "1"));
  const limit  = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));
  const status = searchParams.get("status") ?? "";
  const search = searchParams.get("search") ?? "";

  const where = {
    ...(status ? { status } : {}),
    ...(search ? {
      OR: [
        { clientName: { contains: search, mode: "insensitive" as const } },
        { clientCode: { contains: search } },
        { number:     { contains: search } },
        { salespersonName: { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const [notes, total] = await Promise.all([
    prisma.pickingNote.findMany({
      where,
      include: {
        items:       { include: { product: { select: { id: true, name: true, code: true, imageUrl: true } } } },
        user:        { select: { name: true, clientCode: true, company: true } },
        salesperson: { select: { name: true } },
        order:       { select: { id: true, sipeNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.pickingNote.count({ where }),
  ]);

  return NextResponse.json({ notes, total, page, limit, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body   = await req.json();
    const number = await generateNumber();

    const note = await prisma.pickingNote.create({
      data: {
        number,
        userId:          body.clientId   ? parseInt(body.clientId)   : null,
        clientCode:      body.clientCode ?? null,
        clientName:      body.clientName ?? null,
        salespersonId:   body.salespersonId ? parseInt(body.salespersonId) : null,
        salespersonName: body.salespersonName ?? null,
        subtotal:        Number(body.subtotal ?? 0),
        tax:             Number(body.tax ?? 0),
        total:           Number(body.total ?? 0),
        notes:           body.notes ?? null,
        status:          "pending",
        items: {
          create: (body.items ?? []).map((item: {
            productId?: number; code?: string; name: string;
            quantity: number; unitPrice: number; type?: string;
          }) => ({
            productId:   item.productId ?? null,
            productCode: item.code      ?? null,
            productName: item.name,
            quantity:    item.quantity,
            unitPrice:   item.unitPrice,
            type:        item.type ?? "unidad",
            subtotal:    item.unitPrice * item.quantity,
          })),
        },
      },
      include: {
        items:       true,
        salesperson: { select: { name: true } },
        user:        { select: { name: true, company: true } },
      },
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (err) {
    console.error("picking-notes POST:", err);
    return NextResponse.json({ error: "Error al crear la nota de pedido" }, { status: 500 });
  }
}
