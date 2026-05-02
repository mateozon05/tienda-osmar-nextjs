"use client";

import { useState } from "react";
import Image from "next/image";
import { useCart, type PurchaseType } from "@/lib/cart";

export type Product = {
  id: number;
  code: string;
  name: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  // Campos bulto/unidad (opcionales — sólo muestran selector si están presentes)
  bulkUnit: string | null;
  bulkSize: number | null;
  bulkPrice: number | null;
  unitPrice: number | null;
  category: { name: string; emoji: string; slug: string } | null;
};

function cloudinaryTransform(url: string): string {
  if (!url.includes("res.cloudinary.com")) return url;
  const TRANSFORMS = "e_trim:20,c_pad,b_white,w_500,h_500,q_auto:good,f_auto,e_vibrance:25";
  return url.replace("/upload/", `/upload/${TRANSFORMS}/`);
}

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  // ¿Tiene datos de bulto Y unidad?
  const hasBulkOption = !!(product.bulkPrice && product.unitPrice);
  const [purchaseType, setPurchaseType] = useState<PurchaseType>(
    hasBulkOption ? "bulto" : "unidad"
  );

  const displayPrice =
    hasBulkOption
      ? purchaseType === "bulto"
        ? product.bulkPrice!
        : product.unitPrice!
      : product.price;

  const bulkLabel = product.bulkUnit ?? "Bulto";
  const sizeLabel =
    product.bulkSize && product.bulkSize > 1
      ? ` ×${product.bulkSize}`
      : "";

  function handleAdd() {
    addItem({
      id: product.id,
      code: product.code,
      name: product.name,
      price: displayPrice,
      emoji: product.category?.emoji ?? "📦",
      purchaseType,
      bulkUnit: product.bulkUnit ?? undefined,
      bulkSize: product.bulkSize ?? undefined,
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
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
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

        {/* Selector Bulto / Unidad — sólo si hay ambos precios */}
        {hasBulkOption && (
          <div className="card-type-toggle">
            <button
              className={`card-type-btn${purchaseType === "bulto" ? " card-type-btn--active" : ""}`}
              onClick={() => setPurchaseType("bulto")}
            >
              {bulkLabel}{sizeLabel}
            </button>
            <button
              className={`card-type-btn${purchaseType === "unidad" ? " card-type-btn--active" : ""}`}
              onClick={() => setPurchaseType("unidad")}
            >
              Unidad
            </button>
          </div>
        )}

        <div className="card-footer">
          <div className="card-price">
            <small>{hasBulkOption ? (purchaseType === "bulto" ? `Por ${bulkLabel}` : "Por unidad") : "Precio"}</small>
            ${displayPrice.toLocaleString("es-AR", { minimumFractionDigits: 0 })}
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
