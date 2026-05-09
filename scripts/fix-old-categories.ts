import * as path from "path";
import { PrismaClient } from "../app/generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const varios = await prisma.category.findUnique({ where: { slug: "varios" } });
  if (!varios) { console.log("No VARIOS category found"); return; }

  const oldSlugs = ["limpieza", "desinfeccion", "lavanderia", "accesorios", "pisos", "bano", "cocina", "todos"];
  const oldCats = await prisma.category.findMany({ where: { slug: { in: oldSlugs } } });
  const oldIds = oldCats.map((c) => c.id);

  console.log("Categorías viejas encontradas:", oldCats.map((c) => `${c.name} (${c.id})`).join(", "));

  const result = await prisma.product.updateMany({
    where: { categoryId: { in: oldIds } },
    data: { categoryId: varios.id },
  });

  console.log(`Reasignados a VARIOS: ${result.count} productos`);

  // Final counts per brand
  const cats = await prisma.category.findMany({
    include: { _count: { select: { products: { where: { active: true } } } } },
    orderBy: { name: "asc" },
  });
  console.log("\nCategorías con productos:");
  cats.filter((c) => c._count.products > 0).forEach((c) => {
    console.log(`  ${c.name}: ${c._count.products}`);
  });

  await prisma.$disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
