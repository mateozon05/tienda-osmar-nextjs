import { prisma } from "../lib/prisma";

async function main() {
  const orders = await prisma.order.findMany({
    where: { importedFromSipe: false },
    orderBy: { id: "desc" },
    take: 5,
    select: {
      id: true,
      total: true,
      subtotal: true,
      tax: true,
      totalWithTax: true,
      status: true,
      shippingAddress: true,
      shippingCity: true,
      orderType: true,
    },
  });

  console.log("Web orders (last 5):");
  console.log(JSON.stringify(orders, null, 2));

  const withNullTotal = orders.filter((o) => (o.total as unknown) === null || (o.total as unknown) === undefined);
  console.log("\nOrders with null total:", withNullTotal.length);

  // Also check a single order with full includes
  if (orders.length > 0) {
    const full = await prisma.order.findUnique({
      where: { id: orders[0].id },
      include: {
        user: { select: { name: true, email: true, clientCode: true } },
        salesperson: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { name: true, code: true, imageUrl: true, price: true } },
          },
        },
      },
    });
    console.log("\nFull order #" + orders[0].id + ":");
    console.log(JSON.stringify(full, null, 2));
  }

  await prisma.$disconnect();
}

main().catch(console.error);
