import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import * as readline from "readline";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as never);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text: string): Promise<string> =>
  new Promise(resolve => rl.question(text, resolve));

async function main() {
  console.log("\n👑  CREAR SUPERADMIN\n");

  const email    = (await question("Email:      ")).trim();
  const name     = (await question("Nombre:     ")).trim();
  const password = (await question("Contraseña: ")).trim();
  rl.close();

  if (!email || !password) {
    console.error("❌  Email y contraseña son requeridos.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("❌  La contraseña debe tener al menos 8 caracteres.");
    process.exit(1);
  }

  const hashed   = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data:  { role: "superadmin", password: hashed, status: "approved" },
    });
    console.log(`\n✅  Usuario ${email} promovido a superadmin.`);
  } else {
    await prisma.user.create({
      data: { email, name: name || email, password: hashed, role: "superadmin", status: "approved" },
    });
    console.log(`\n✅  Superadmin ${email} creado exitosamente.`);
  }

  console.log("👑  Ya podés loguearte con esas credenciales.\n");
}

main()
  .catch(e => { console.error("❌ Error:", e.message); process.exit(1); })
  .finally(() => pool.end());
