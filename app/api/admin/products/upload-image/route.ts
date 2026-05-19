import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ?? "dq1wgq8ad",
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

      // Si NO es de Cloudinary → re-subir desde URL
      if (!imageUrl.includes("cloudinary.com")) {
        const result = await cloudinary.uploader.upload(imageUrl, {
          folder: "osmar-products",
          transformation: [
            { width: 800, height: 800, crop: "limit" },
            { quality: "auto", fetch_format: "auto" },
          ],
          timeout: 60000,
        });
        finalUrl = result.secure_url;
      }

      // Actualizar la BD
      await prisma.product.update({
        where: { id: parseInt(String(productId)) },
        data: { imageUrl: finalUrl },
      });

      return NextResponse.json({ success: true, url: finalUrl, wasUploaded: !imageUrl.includes("cloudinary.com") });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al procesar imagen";
      console.error("Cloudinary URL upload error:", err);
      return NextResponse.json({ error: msg }, { status: 500 });
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
