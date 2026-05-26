import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ?? "dq1wgq8ad",
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Descarga una imagen desde una URL externa y la devuelve como Buffer.
 *
 * Estrategia de dos intentos:
 *  1. Sin headers — funciona con WAFs que bloquean User-Agent de navegadores
 *     (ej: dixlimpieza.com y sitios con "reverse hotlink protection")
 *  2. Con headers de navegador — funciona con sitios que requieren Referer/UA
 *     (ej: sitios con hotlink-protection tradicional)
 */
async function downloadImageToBuffer(url: string): Promise<Buffer> {
  async function fetchAttempt(headers: HeadersInit): Promise<Buffer> {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      throw new Error(`Respuesta no es imagen (${contentType})`);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  // Intento 1: sin headers (pasa WAFs que bloquean User-Agent)
  try {
    return await fetchAttempt({});
  } catch {
    // Intento 2: con headers de navegador (pasa hotlink-protection tradicional)
    return await fetchAttempt({
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
      Referer: new URL(url).origin,
    });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";

  // ── A) JSON body: re-upload URL to Cloudinary ──────────────────────────────
  if (contentType.includes("application/json")) {
    try {
      const { imageUrl, productId } = await req.json();

      if (!imageUrl || !productId) {
        return NextResponse.json({ error: "Faltan datos: imageUrl y productId requeridos" }, { status: 400 });
      }

      let finalUrl: string = imageUrl;

      // Si NO es de Cloudinary → re-subir desde URL (con fallback por descarga manual)
      if (!imageUrl.includes("cloudinary.com")) {
        let uploadResult: { secure_url: string };

        try {
          // Intento 1: subida directa desde URL
          uploadResult = await cloudinary.uploader.upload(imageUrl, {
            folder: "osmar-products",
            transformation: [
              { width: 800, height: 800, crop: "limit" },
              { quality: "auto", fetch_format: "auto" },
            ],
            timeout: 30000,
          });
        } catch (directError) {
          // Intento 2: descargar la imagen en el servidor y subirla como buffer
          // (evita CORS / hotlink-protection del sitio externo)
          console.log(
            "Subida directa falló, intentando descarga manual…",
            directError instanceof Error ? directError.message : directError
          );

          const imageBuffer = await downloadImageToBuffer(imageUrl);

          uploadResult = await new Promise<{ secure_url: string }>(
            (resolve, reject) => {
              cloudinary.uploader
                .upload_stream(
                  {
                    folder: "osmar-products",
                    transformation: [
                      { width: 800, height: 800, crop: "limit" },
                      { quality: "auto", fetch_format: "auto" },
                    ],
                  },
                  (error, result) => {
                    if (error || !result) reject(error ?? new Error("Upload stream falló"));
                    else resolve(result as { secure_url: string });
                  }
                )
                .end(imageBuffer);
            }
          );
        }

        finalUrl = uploadResult.secure_url;
      }

      // Actualizar la BD
      await prisma.product.update({
        where: { id: parseInt(String(productId)) },
        data: { imageUrl: finalUrl },
      });

      return NextResponse.json({ success: true, url: finalUrl, wasUploaded: !imageUrl.includes("cloudinary.com") });
    } catch (err: unknown) {
      console.error("Cloudinary URL upload error:", err);
      return NextResponse.json(
        {
          error:
            "No se pudo procesar la imagen. Intentá con otra URL o subí el archivo directamente.",
        },
        { status: 500 }
      );
    }
  }

  // ── B) FormData body: direct file upload ────────────────────────────────────
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const productCode = formData.get("productCode") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "osmar-products",
            public_id: productCode
              ? `prod_${productCode.replace(/[^a-zA-Z0-9]/g, "_")}`
              : undefined,
            overwrite: true,
            resource_type: "image",
            transformation: [
              { width: 800, height: 800, crop: "limit" },
              { quality: "auto", fetch_format: "auto" },
            ],
          },
          (error, result) => {
            if (error || !result) reject(error ?? new Error("Upload failed"));
            else resolve(result as { secure_url: string; public_id: string });
          }
        );
        uploadStream.end(buffer);
      }
    );

    return NextResponse.json({ url: result.secure_url, publicId: result.public_id });
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
