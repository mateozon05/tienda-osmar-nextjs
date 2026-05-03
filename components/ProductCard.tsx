"use client";

import { useState } from "react";
import Image from "next/image";
import { useCart, type PurchaseType } from "@/lib/cart";
import { useToast } from "@/components/Toast";

export type Product = {
  id: number;
  code: string;
  name: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  bulkUnit: string | null;
  bulkSize: number | null;
  bulkPrice: number | null;
  unitPrice: number | null;
  category: { name: string; emoji: string; slug: string } | null;
};

function cloudinaryTransform(url: string): string {
  if (!url.includes("res.cloudinary.com")) return url;
  const T = "e_trim:20,c_pad,b_white,w_500,h_500,q_auto:good,f_auto,e_vibrance:25";
  return url.replace("/upload/", `/upload/${T}/`);
}

function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0)  return <span className="prod-badge prod-badge--out">Sin stock</span>;
  if (stock <= 5)  return <span className="prod-badge prod-badge--low">¡Quedan {stock}!</span>;
  if (stock <= 15) return <span className="prod-badge prod-badge--warn">Stock bajo</span>;
  return null;
}

export default function ProductCard({
  product,
  onExpand,
}: {
  product: Product;
  onExpand?: (p: Product) => void;
}) {
  const { addItem } = useCart();
  const { addToast } = useToast();
  const [added, setAdded]       = useState(false);
  const [imgError, setImgError] = useState(false);

  const hasBulkOption = !!(product.bulkPrice && product.unitPrice);
  const [purchaseType, setPurchaseType] = useState<PurchaseType>(
    hasBulkOption ? "bulto" : "unidad"
  );

  const displayPrice =
    hasBulkOption
      ? (purchaseType === "bulto" ? product.bulkPrice! : product.unitPrice!)
      : product.price;

  const bulkLabel  = product.bulkUnit ?? "Bulto";
  const sizeLabel  = product.bulkSize && product.bulkSize > 1 ? ` ×${product.bulkSize}` : "";

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
    const label = hasBulkOption
      ? (purchaseType === "bulto" ? `${bulkLabel}` : "unidad")
      : "";
    addToast(`✓ ${product.name}${label ? ` (${label})` : ""} agregado al carrito`);
  }

  const hasImage = product.imageUrl && !imgError;
  const imgSrc   = hasImage ? cloudinaryTransform(product.imageUrl!) : null;

  return (
    <div
      className="product-card"
      onClick={() => onExpand?.(product)}
      role={onExpand ? "button" : undefined}
      tabIndex={onExpand ? 0 : undefined}
      onKeyDown={onExpand ? e => { if (e.key === "Enter") onExpand(product); } : undefined}
    >
      {/* Badge layer */}
      <div className="prod-badges">
        <StockBadge stock={product.stock} />
      </div>

      <div className={`card-img${hasImage ? " card-img--photo" : ""}`}>
        {imgSrc ? (
          <Image
            src={imgSrc}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
            className="card-photo"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <span className="card-emoji">{product.category?.emoji ?? "📦"}</span>
        )}
      </div>

      <div className="card-body">
        <div className="card-cat">{product.category?.name ?? "General"}</div>
        <div className="card-name">{product.name}</div>
        <div className="card-code">Cód: {product.code}</div>

        {hasBulkOption && (
          <div className="card-type-toggle">
            <button
              className={`card-type-btn${purchaseType === "bulto" ? " card-type-btn--active" : ""}`}
              onClick={e => { e.stopPropagation(); setPurchaseType("bulto"); }}
            >
              {bulkLabel}{sizeLabel}
            </button>
            <button
              className={`card-type-btn${purchaseType === "unidad" ? " card-type-btn--active" : ""}`}
              onClick={e => { e.stopPropagation(); setPurchaseType("unidad"); }}
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
            onClick={e => { e.stopPropagation(); handleAdd(); }}
            title="Agregar al carrito"
            disabled={product.stock <= 0}
          >
            {added ? "✓" : "+"}
          </button>
        </div>
      </div>
    </div>
  );
}
