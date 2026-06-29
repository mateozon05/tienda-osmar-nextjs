import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const CLOUD_NAME    = (process.env.CLOUDINARY_CLOUD_NAME ?? "")
  .replace(/^﻿/, "").trim() || "dq1wgq8ad";
const UPLOAD_PRESET = (process.env.CLOUDINARY_UPLOAD_PRESET ?? "")
  .replace(/^﻿/, "").trim() || "osmar-products-unsigned";

async function downloadImage(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const headerSets: HeadersInit[] = [
    {},
    {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept:       "image/webp,image/apng,image/*,*/*;q=0.8",
      Referer:      new URL(url).origin + "/",
    },
  ];

  let lastError: Error = new Error("No se pudo descargar la imagen");

  for (const headers of headerSets) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status} al descargar`);
      const mimeType = res.headers.get("content-type") ?? "";
      if (!mimeType.startsWith("image/")) {
        throw new Error(
          `La URL no apunta a una imagen (${mimeType || "sin content-type"}). ` +
          `Usá botón derecho → "Copiar dirección de imagen".`
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

async function uploadToCloudinary(buffer: Buffer, mimeType: string, productId: number): Promise<string> {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  const fd = new FormData();
  fd.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), "image.jpg");
  fd.append("upload_preset", UPLOAD_PRESET);
  fd.append("public_id", `prod_bulk_${productId}`);

  const res  = await fetch(url, { method: "POST", body: fd });
  const data = await res.json() as { secure_url?: string; error?: { message: string } };

  if (!res.ok || !data.secure_url) {
    throw new Error(data.error?.message ?? "Error al subir a Cloudinary");
  }
  return data.secure_url;
}

interface ImageUploadItem {
  productId: number;
  imageUrl:  string;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  let items: ImageUploadItem[] = [];
  try {
    const body = await req.json();
    items = body.items ?? [];
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (items.length === 0) {
    return NextResponse.json({ error: "No hay items" }, { status: 400 });
  }

  const batch   = items.slice(0, 20);
  const results: Array<{
    productId: number;
    status: "success" | "error";
    imageUrl?: string;
    error?: string;
  }> = [];

  for (const item of batch) {
    try {
      if (!item.imageUrl || !item.productId) throw new Error("Datos incompletos");

      let finalUrl = item.imageUrl;

      if (!item.imageUrl.includes("cloudinary.com")) {
        const { buffer, mimeType } = await downloadImage(item.imageUrl);
        finalUrl = await uploadToCloudinary(buffer, mimeType, item.productId);
      }

      await prisma.product.update({
        where: { id: item.productId },
        data:  { imageUrl: finalUrl },
      });

      results.push({ productId: item.productId, status: "success", imageUrl: finalUrl });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[bulk-images] productId=${item.productId}:`, message);
      results.push({ productId: item.productId, status: "error", error: message });
    }
  }

  return NextResponse.json({
    success: true,
    total:   batch.length,
    done:    results.filter((r) => r.status === "success").length,
    errors:  results.filter((r) => r.status === "error").length,
    results,
  });
}
