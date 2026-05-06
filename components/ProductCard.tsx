"use client";

import { useState } from "react";
import Image from "next/image";
import { useCart, type PurchaseType } from "@/lib/cart";
import { useToast } from "@/components/Toast";
import { useFavorites } from "@/lib/favorites";

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
  originalPrice?: number | null;
  discountPercentage?: number | null;
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

// ── Inline heart icons ────────────────────────────────────
function HeartFilled() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}
function HeartOutline() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

export default function ProductCard({
  product,
  onExpand,
}: {
  product: Product;
  onExpand?: (p: Product) => void;
}) {
  const { addItem }    = useCart();
  const { addToast }   = useToast();
  const { isFavorite, toggle } = useFavorites();

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

  const discount = product.discountPercentage ?? 0;
  const hasDiscount = discount > 0 && product.originalPrice != null;
  const originalDisplayPrice = hasDiscount
    ? (hasBulkOption
        ? Math.round((purchaseType === "bulto" ? product.bulkPrice! : product.unitPrice!) / (1 - discount / 100))
        : product.originalPrice!)
    : null;

  const bulkLabel  = product.bulkUnit ?? "Bulto";
  const sizeLabel  = product.bulkSize && product.bulkSize > 1 ? ` ×${product.bulkSize}` : "";
  const fav        = isFavorite(product.id);

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
    const label = hasBulkOption ? (purchaseType === "bulto" ? bulkLabel : "unidad") : "";
    addToast(`✓ ${product.name}${label ? ` (${label})` : ""} agregado al carrito`);
  }

  function handleToggleFav(e: React.MouseEvent) {
    e.stopPropagation();
    toggle(product);
    addToast(
      fav ? `💔 ${product.name} eliminado de favoritos` : `❤️ ${product.name} guardado en favoritos`,
      fav ? "info" : "success"
    );
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
      {/* ── Badges ── */}
      <div className="prod-badges">
        <StockBadge stock={product.stock} />
        {hasDiscount && (
          <span className="prod-badge prod-badge--discount">-{discount}%</span>
        )}
      </div>

      {/* ── Heart / Favorite button ── */}
      <button
        className={`fav-btn${fav ? " fav-btn--active" : ""}`}
        onClick={handleToggleFav}
        aria-label={fav ? "Quitar de favoritos" : "Agregar a favoritos"}
        title={fav ? "Quitar de favoritos" : "Agregar a favoritos"}
      >
        {fav ? <HeartFilled /> : <HeartOutline />}
      </button>

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
            {hasDiscount && (
              <span className="card-price-original">
                ${originalDisplayPrice!.toLocaleString("es-AR", { minimumFractionDigits: 0 })}
              </span>
            )}
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
