/**
 * find-product-images.ts
 * ─────────────────────
 * Genera un archivo HTML con links de búsqueda en Google Images
 * para todos los productos SIN imagen asignada.
 *
 * Uso: npm run find:images
 * Output: outputs/busqueda-imagenes.html  (abrir en el navegador)
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as never);

async function main() {
  console.log("🔍 Buscando productos sin imagen…");

  const products = await prisma.product.findMany({
    where: { active: true, imageUrl: null },
    select: {
      id: true,
      code: true,
      name: true,
      category: { select: { name: true, emoji: true } },
    },
    orderBy: [
      { category: { name: "asc" } },
      { name: "asc" },
    ],
  });

  console.log(`📦 ${products.length} productos sin imagen encontrados.`);

  if (products.length === 0) {
    console.log("✅ ¡Todos los productos tienen imagen!");
    await prisma.$disconnect();
    return;
  }

  // Group by category
  const byCategory = new Map<string, typeof products>();
  for (const p of products) {
    const cat = p.category ? `${p.category.emoji} ${p.category.name}` : "📦 Sin categoría";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(p);
  }

  // Build HTML
  let rows = "";
  for (const [cat, prods] of byCategory) {
    rows += `
    <tr class="cat-row">
      <td colspan="4">${cat} <span class="badge">${prods.length}</span></td>
    </tr>`;
    for (const p of prods) {
      const q = encodeURIComponent(`${p.name} producto limpieza`);
      const googleUrl = `https://www.google.com/search?tbm=isch&q=${q}`;
      const ml = `https://listado.mercadolibre.com.ar/${encodeURIComponent(p.name)}`;
      rows += `
    <tr>
      <td class="code">${p.code}</td>
      <td class="name">${p.name}</td>
      <td>
        <a href="${googleUrl}" target="_blank" class="btn btn-google">🔍 Google Images</a>
      </td>
      <td>
        <a href="${ml}" target="_blank" class="btn btn-ml">🛒 MercadoLibre</a>
      </td>
    </tr>`;
    }
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Búsqueda de imágenes — Distribuidora Osmar</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #F9FAFB; color: #111827; padding: 24px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .subtitle { color: #6B7280; font-size: 14px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
  th { text-align: left; padding: 12px 14px; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #6B7280; background: #F3F4F6; border-bottom: 1px solid #E5E7EB; }
  td { padding: 10px 14px; border-bottom: 1px solid #F3F4F6; font-size: 13.5px; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr.cat-row td { background: #FFF7ED; font-weight: 700; color: #C2410C; font-size: 13px; padding: 8px 14px; border-bottom: 1px solid #FED7AA; }
  .badge { display: inline-block; background: #FF6E00; color: #fff; border-radius: 999px; font-size: 11px; font-weight: 700; padding: 1px 8px; margin-left: 6px; }
  .code { color: #6B7280; font-family: monospace; font-size: 12px; }
  .name { font-weight: 500; }
  .btn { display: inline-flex; align-items: center; gap: 4px; padding: 5px 12px; border-radius: 7px; font-size: 12.5px; font-weight: 600; text-decoration: none; transition: opacity .15s; }
  .btn:hover { opacity: .8; }
  .btn-google { background: #EFF6FF; color: #1D4ED8; }
  .btn-ml { background: #FFF7ED; color: #C2410C; }
  .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #9CA3AF; }
  input[type=text] { padding: 8px 12px; border: 1.5px solid #D1D5DB; border-radius: 8px; font-size: 13px; width: 300px; margin-bottom: 16px; }
</style>
</head>
<body>
<h1>🖼️ Productos sin imagen</h1>
<p class="subtitle">Generado el ${new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })} · ${products.length} productos</p>
<input type="text" id="buscar" placeholder="Filtrar por nombre o código…" oninput="filtrar(this.value)" />
<table id="tabla">
  <thead>
    <tr>
      <th>Código</th>
      <th>Producto</th>
      <th>Google Images</th>
      <th>MercadoLibre</th>
    </tr>
  </thead>
  <tbody>${rows}
  </tbody>
</table>
<p class="footer">Distribuidora Osmar · Para actualizar las imágenes usá el panel admin → Imágenes</p>
<script>
function filtrar(q) {
  q = q.toLowerCase();
  const filas = document.querySelectorAll('#tabla tbody tr:not(.cat-row)');
  filas.forEach(tr => {
    const txt = tr.textContent.toLowerCase();
    tr.style.display = txt.includes(q) ? '' : 'none';
  });
}
</script>
</body>
</html>`;

  const outDir = path.join(process.cwd(), "outputs");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, "busqueda-imagenes.html");
  fs.writeFileSync(outPath, html, "utf8");

  console.log(`✅ HTML generado: ${outPath}`);
  console.log("👉 Abrí el archivo en tu navegador para buscar las imágenes.");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
