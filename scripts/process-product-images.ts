/**
 * process-product-images.ts
 * ─────────────────────────
 * Toma imágenes de una carpeta local, las relaciona con productos
 * por código/nombre, las sube a Cloudinary y actualiza la DB.
 *
 * Uso: npm run process:images [-- --folder=./mis-fotos]
 * Por defecto busca en: ./inputs/product-images/
 *
 * Convenciones de nombre de archivo:
 *   - Por código:   ABC123.jpg  →  busca product.code === "ABC123"
 *   - Por nombre parcial: cualquier imagen cuyo nombre esté contenido en product.name
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { Pool } from "pg";
import { v2 as cloudinary } from "cloudinary";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ?? "dq1wgq8ad",
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as never);

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

function getArg(name: string, fallback: string): string {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split("=").slice(1).join("=") : fallback;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function uploadToCloudinary(filePath: string, publicId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      {
        folder: "productos-osmar",
        public_id: publicId,
        overwrite: true,
        resource_type: "image",
        transformation: [
          { width: 800, height: 800, crop: "limit" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error || !result) reject(error ?? new Error("Upload failed"));
        else resolve(result.secure_url);
      }
    );
  });
}

async function main() {
  const folderArg = getArg("folder", "./inputs/product-images");
  const folder = path.resolve(process.cwd(), folderArg);

  if (!fs.existsSync(folder)) {
    console.error(`❌ Carpeta no encontrada: ${folder}`);
    console.error(`   Creá la carpeta y colocá las imágenes ahí, o usá --folder=ruta`);
    process.exit(1);
  }

  const files = fs.readdirSync(folder).filter((f) =>
    IMAGE_EXTS.includes(path.extname(f).toLowerCase())
  );

  if (files.length === 0) {
    console.log("⚠️  No se encontraron imágenes en la carpeta.");
    await prisma.$disconnect();
    return;
  }

  console.log(`📁 ${files.length} imágenes encontradas en ${folder}`);

  // Load all products
  const products = await prisma.product.findMany({
    select: { id: true, code: true, name: true },
  });

  const codeMap = new Map(products.map((p) => [normalize(p.code), p]));
  const nameMap = new Map(products.map((p) => [normalize(p.name), p]));

  let matched = 0;
  let skipped = 0;
  let errors  = 0;

  for (const file of files) {
    const ext  = path.extname(file).toLowerCase();
    const base = path.basename(file, ext);
    const norm = normalize(base);
    const filePath = path.join(folder, file);

    // Try matching by code first, then by name
    let product = codeMap.get(norm) ?? nameMap.get(norm) ?? null;

    // Fuzzy: filename is contained in product name
    if (!product) {
      product = products.find(
        (p) => normalize(p.name).includes(norm) || norm.includes(normalize(p.code))
      ) ?? null;
    }

    if (!product) {
      console.log(`  ⚠️  Sin match: ${file}`);
      skipped++;
      continue;
    }

    try {
      console.log(`  ⬆️  Subiendo ${file} → ${product.name} (${product.code})…`);
      const publicId = `prod_${normalize(product.code)}`;
      const url = await uploadToCloudinary(filePath, publicId);

      await prisma.product.update({
        where: { id: product.id },
        data: { imageUrl: url },
      });

      console.log(`  ✅ OK: ${url}`);
      matched++;
    } catch (err) {
      console.error(`  ❌ Error con ${file}:`, err);
      errors++;
    }
  }

  console.log(`\n📊 Resumen:`);
  console.log(`   ✅ Subidos:    ${matched}`);
  console.log(`   ⚠️  Sin match:  ${skipped}`);
  console.log(`   ❌ Errores:    ${errors}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
