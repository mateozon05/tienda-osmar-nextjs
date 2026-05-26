import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Usamos la REST API de Cloudinary directamente con preset unsigned.
// No se necesita API key ni API secret — solo cloud_name y upload_preset.
const CLOUD_NAME    = process.env.CLOUDINARY_CLOUD_NAME ?? "dq1wgq8ad";
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET ?? "osmar-products-unsigned";

/**
 * Descarga una imagen desde una URL externa como Buffer.
 * Dos intentos de headers para evadir hotlink-protection y WAFs.
 */
async function downloadImage(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const headerSets: HeadersInit[] = [
    // Sin headers — pasa WAFs que bloquean User-Agent de browsers
    {},
    // Headers de navegador — pasa hotlink-protection tradicional
    {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept:  "image/webp,image/apng,image/*,*/*;q=0.8",
      Referer: new URL(url).origin + "/",
    },
  ];

  let lastError: Error = new Error("No se pudo descargar la imagen");

  for (const headers of headerSets) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status} al descargar la imagen`);
      const mimeType = res.headers.get("content-type") ?? "";
      if (!mimeType.startsWith("image/")) {
        throw new Error(
          `La URL no apunta a una imagen (${mimeType || "sin content-type"}). ` +
          `Asegurate de copiar la URL directa de la imagen (botón derecho → "Copiar dirección de imagen").`
        );
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      return { buffer, mimeType };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError;
}

/**
 * Sube un buffer a Cloudinary via REST API con preset unsigned.
 * Más confiable que upload_stream para presets unsigned.
 */
async function uploadToCloudinary(
  buffer: Buffer,
  mimeType: string,
  publicId?: string
): Promise<string> {
  const fd = new FormData();
  fd.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), "image.jpg");
  fd.append("upload_preset", UPLOAD_PRESET);
  if (publicId) fd.append("public_id", publicId);

  const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body:   fd,
  });
  const data = await res.json() as { secure_url?: string; error?: { message: string } };

  if (!res.ok || !data.secure_url) {
    throw new Error(data.error?.message ?? "Error al subir a Cloudinary");
  }
  return data.secure_url;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";

  // ── A) JSON: URL externa → descargar en servidor → subir a Cloudinary ────────
  if (contentType.includes("application/json")) {
    let imageUrl = "";
    let productId = 0;

    try {
      const body = await req.json();
      imageUrl  = body.imageUrl  ?? "";
      productId = parseInt(String(body.productId ?? 0));

      if (!imageUrl || !productId) {
        return NextResponse.json(
          { error: "Faltan datos: imageUrl y productId requeridos" },
          { status: 400 }
        );
      }

      let finalUrl = imageUrl;

      if (!imageUrl.includes("cloudinary.com")) {
        console.log("[upload-image] Descargando desde:", imageUrl);
        const { buffer, mimeType } = await downloadImage(imageUrl);
        console.log("[upload-image] Descargado:", buffer.length, "bytes. Subiendo a Cloudinary…");

        finalUrl = await uploadToCloudinary(buffer, mimeType, `prod_ext_${productId}`);
        console.log("[upload-image] Subido:", finalUrl);
      }

      await prisma.product.update({
        where: { id: productId },
        data:  { imageUrl: finalUrl },
      });

      return NextResponse.json({ success: true, url: finalUrl });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[upload-image] ERROR URL:", imageUrl, "→", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // ── B) FormData: archivo directo → subir a Cloudinary ────────────────────────
  try {
    const formData    = await req.formData();
    const file        = formData.get("file")        as File   | null;
    const productCode = formData.get("productCode") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
    }

    const buffer   = Buffer.from(await file.arrayBuffer());
    const publicId = productCode
      ? `prod_${productCode.replace(/[^a-zA-Z0-9]/g, "_")}`
      : undefined;

    const finalUrl = await uploadToCloudinary(buffer, file.type || "image/jpeg", publicId);

    return NextResponse.json({ url: finalUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[upload-image] ERROR archivo:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
