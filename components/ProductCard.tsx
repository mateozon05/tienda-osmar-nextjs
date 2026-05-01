"use client";

import { useState } from "react";
import Image from "next/image";
import { useCart } from "@/lib/cart";

export type Product = {
  id: number;
  code: string;
  name: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  category: { name: string; emoji: string; slug: string } | null;
};

/**
 * Aplica transformaciones Cloudinary dinámicamente en la URL.
 * Las imágenes en BD tienen la URL base (sin parámetros).
 * Cloudinary procesa y cachea el resultado automáticamente.
 *
 * Transformaciones:
 *   e_trim:20     → recorta bordes del mismo color (elimina márgenes blancos/grises)
 *   c_pad         → rellena con padding para cuadrar la imagen
 *   b_white       → fondo blanco limpio
 *   w_500,h_500   → 500×500 px
 *   q_auto:good   → calidad óptima automática
 *   f_auto        → formato automático (WebP/AVIF según el navegador)
 *   e_vibrance:25 → satura colores (elimina el efecto "grisáceo")
 */
function cloudinaryTransform(url: string): string {
  if (!url.includes("res.cloudinary.com")) return url;
  const TRANSFORMS = "e_trim:20,c_pad,b_white,w_500,h_500,q_auto:good,f_auto,e_vibrance:25";
  return url.replace("/upload/", `/upload/${TRANSFORMS}/`);
}

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  function handleAdd() {
    addItem({
      id: product.id,
      code: product.code,
      name: product.name,
      price: product.price,
      emoji: product.category?.emoji ?? "📦",
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 800);
  }

  const hasImage = product.imageUrl && !imgError;
  const imgSrc = hasImage ? cloudinaryTransform(product.imageUrl!) : null;

  return (
    <div className="product-card">
      <div className={`card-img${hasImage ? " card-img--photo" : ""}`}>
        {imgSrc ? (
          <Image
            src={imgSrc}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
            className="card-photo"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="card-emoji">{product.category?.emoji ?? "📦"}</span>
        )}
      </div>
      <div className="card-body">
        <div className="card-cat">{product.category?.name ?? "General"}</div>
        <div className="card-name">{product.name}</div>
        <div className="card-code">Cód: {product.code}</div>
        <div className="card-footer">
          <div className="card-price">
            <small>Precio unitario</small>$
            {product.price.toLocaleString("es-AR", { minimumFractionDigits: 0 })}
          </div>
          <button
            className={`btn-add${added ? " btn-add--added" : ""}`}
            onClick={handleAdd}
            title="Agregar al carrito"
          >
            {added ? "✓" : "+"}
          </button>
        </div>
      </div>
    </div>
  );
}
