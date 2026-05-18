import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const search = searchParams.get("search") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const where = {
    importedFromSipe: false,
    ...(status && { status }),
    ...(search && {
      OR: [
        { guestName: { contains: search } },
        { guestEmail: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
      ],
    }),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { name: true, email: true } },
        items: { select: { quantity: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({ orders, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      clientId,
      clientCode,
      clientName,
      salespersonId,
      paymentMethod = "efectivo",
      shippingMethod = "retiro",
      shippingAddress = "",
      shippingCity = "",
      notes = "",
      items,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Debe agregar al menos un producto" }, { status: 400 });
    }

    // Calculate totals
    const subtotal = items.reduce(
      (s: number, i: { unitPrice: number; quantity: number }) => s + i.unitPrice * i.quantity,
      0
    );
    const total = subtotal;

    // Determine commission
    let commissionRate: number | null = null;
    let commissionAmount: number | null = null;
    if (salespersonId) {
      const sp = await prisma.salesperson.findUnique({ where: { id: salespersonId } });
      if (sp) {
        commissionRate = sp.defaultCommission;
        commissionAmount = parseFloat(((total * commissionRate) / 100).toFixed(2));
      }
    }

    const order = await prisma.order.create({
      data: {
        ...(clientId && { userId: clientId }),
        clientCode: clientCode || null,
        clientName: clientName || null,
        salespersonId: salespersonId || null,
        commissionRate,
        commissionAmount,
        paymentMethod,
        shippingMethod,
        shippingAddress,
        shippingCity,
        notes,
        total,
        subtotal,
        status: "pendiente",
        importedFromSipe: false,
        items: {
          create: items.map((i: { productId: number; quantity: number; unitPrice: number }) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
      },
      include: {
        items: { include: { product: { select: { name: true, code: true } } } },
      },
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    console.error("Error creating order:", err);
    return NextResponse.json({ error: "Error al crear la orden" }, { status: 500 });
  }
}
