import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

prisma.product
  .findMany({
    select: { id: true, code: true, name: true, imageUrl: true },
    orderBy: { code: "asc" },
  })
  .then((r) => {
    console.log(JSON.stringify(r));
    pool.end();
  })
  .catch((e) => console.error(e.message));
