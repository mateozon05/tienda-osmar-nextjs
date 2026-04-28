import { PrismaClient } from "../app/generated/prisma/client";
import bcrypt from "bcryptjs";

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";

  if (url.startsWith("postgresql") || url.startsWith("postgres")) {
    // PostgreSQL via pg (Neon, Railway, etc.)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require("pg");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaPg } = require("@prisma/adapter-pg");
    const pool = new Pool({ connectionString: url });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }

  // SQLite (desarrollo local)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("path");
  const dbPath = url.replace("file:", "");
  const absolutePath = path.isAbsolute(dbPath)
    ? dbPath
    : path.join(process.cwd(), dbPath);
  const adapter = new PrismaBetterSqlite3({ url: absolutePath });
  return new PrismaClient({ adapter });
}

const prisma = createClient();

async function main() {
  const categories = [
    { name: "Todos", slug: "todos", emoji: "🏠" },
    { name: "Limpieza", slug: "limpieza", emoji: "🧹" },
    { name: "Desinfección", slug: "desinfeccion", emoji: "🧴" },
    { name: "Lavandería", slug: "lavanderia", emoji: "👕" },
    { name: "Cocina", slug: "cocina", emoji: "🍽️" },
    { name: "Baño", slug: "bano", emoji: "🚿" },
    { name: "Pisos", slug: "pisos", emoji: "🪣" },
    { name: "Accesorios", slug: "accesorios", emoji: "🧰" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  const limpieza = await prisma.category.findUnique({ where: { slug: "limpieza" } });
  const desinfeccion = await prisma.category.findUnique({ where: { slug: "desinfeccion" } });

  const sampleProducts = [
    { code: "LIM001", name: "Lavandina 1L Familiar", price: 850, stock: 120, categoryId: limpieza!.id },
    { code: "LIM002", name: "Detergente 500ml Ultra", price: 620, stock: 80, categoryId: limpieza!.id },
    { code: "LIM003", name: "Limpiador Multiuso 750ml", price: 540, stock: 95, categoryId: limpieza!.id },
    { code: "DES001", name: "Desinfectante Pino 1L", price: 980, stock: 60, categoryId: desinfeccion!.id },
    { code: "DES002", name: "Alcohol en Gel 500ml", price: 1200, stock: 45, categoryId: desinfeccion!.id },
  ];

  for (const product of sampleProducts) {
    await prisma.product.upsert({
      where: { code: product.code },
      update: {},
      create: product,
    });
  }

  await prisma.user.upsert({
    where: { email: "admin@osmar.com" },
    update: {},
    create: {
      email: "admin@osmar.com",
      password: await bcrypt.hash("admin123", 10),
      name: "Osmar Admin",
      role: "admin",
    },
  });

  console.log("✅ Seed completado — categorías, productos y admin creados en Neon.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
