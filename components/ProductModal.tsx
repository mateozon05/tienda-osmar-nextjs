"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useCart, type PurchaseType } from "@/lib/cart";
import type { Product } from "./ProductCard";

function cloudinaryLarge(url: string): string {
  if (!url.includes("res.cloudinary.com")) return url;
  const T = "e_trim:20,c_pad,b_white,w_800,h_800,q_auto:good,f_auto,e_vibrance:25";
  return url.replace("/upload/", `/upload/${T}/`);
}

type Props = {
  product: Product | null;
  onClose: () => void;
};

export default function ProductModal({ product, onClose }: Props) {
  const { addItem } = useCart();
  const [imgError, setImgError]     = useState(false);
  const [added, setAdded]           = useState(false);
  const [quantity, setQuantity]     = useState(1);

  const hasBulk = !!(product?.bulkPrice && product?.unitPrice);
  const [purchaseType, setPurchaseType] = useState<PurchaseType>("bulto");

  // Reset state when product changes
  useEffect(() => {
    setImgError(false);
    setAdded(false);
    setQuantity(1);
    setPurchaseType(hasBulk ? "bulto" : "unidad");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  // Escape key + body scroll lock
  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose]
  );
  useEffect(() => {
    if (!product) return;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [product, handleKey]);

  if (!product) return null;

  const bulkLabel = product.bulkUnit ?? "Bulto";
  const sizeLabel = product.bulkSize && product.bulkSize > 1 ? ` ×${product.bulkSize}` : "";
  const displayPrice = hasBulk
    ? purchaseType === "bulto" ? product.bulkPrice! : product.unitPrice!
    : product.price;
  const priceLabel = hasBulk
    ? purchaseType === "bulto" ? `Por ${bulkLabel}` : "Por unidad"
    : "Precio mayorista";

  const hasImage = product.imageUrl && !imgError;
  const imgSrc   = hasImage ? cloudinaryLarge(product.imageUrl!) : null;

  function handleAdd() {
    addItem({
      id: product!.id,
      code: product!.code,
      name: product!.name,
      price: displayPrice,
      emoji: product!.category?.emoji ?? "📦",
      purchaseType,
      bulkUnit: product!.bulkUnit ?? undefined,
      bulkSize: product!.bulkSize ?? undefined,
    });
    setAdded(true);
    setTimeout(() => { setAdded(false); }, 1800);
  }

  function changeQty(delta: number) {
    setQuantity(q => Math.max(1, q + delta));
  }

  return (
    <div className="pm-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={product.name}>
      <div className="pm-card" onClick={e => e.stopPropagation()}>

        {/* Close button */}
        <button className="pm-close" onClick={onClose} aria-label="Cerrar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Image column */}
        <div className="pm-image-col">
          {imgSrc ? (
            <div className="pm-img-wrap">
              <Image
                src={imgSrc}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 90vw, 340px"
                className="pm-photo"
                onError={() => setImgError(true)}
              />
            </div>
          ) : (
            <div className="pm-img-fallback">
              <span>{product.category?.emoji ?? "📦"}</span>
            </div>
          )}
        </div>

        {/* Info column */}
        <div className="pm-info-col">

          {/* Category badge */}
          <div className="pm-cat-badge">
            <span>{product.category?.emoji ?? "📦"}</span>
            {product.category?.name ?? "General"}
          </div>

          {/* Name + code */}
          <h2 className="pm-name">{product.name}</h2>
          <p className="pm-code">Código: <strong>{product.code}</strong></p>

          <div className="pm-divider" />

          {/* Bulto / Unidad toggle */}
          {hasBulk && (
            <div className="pm-section">
              <p className="pm-section-label">Comprar por:</p>
              <div className="pm-type-toggle">
                <button
                  className={`pm-type-btn${purchaseType === "bulto" ? " pm-type-btn--active" : ""}`}
                  onClick={() => setPurchaseType("bulto")}
                >
                  {bulkLabel}{sizeLabel}
                </button>
                <button
                  className={`pm-type-btn${purchaseType === "unidad" ? " pm-type-btn--active" : ""}`}
                  onClick={() => setPurchaseType("unidad")}
                >
                  Unidad
                </button>
              </div>
            </div>
          )}

          {/* Price */}
          <div className="pm-price-block">
            <span className="pm-price-label">{priceLabel}</span>
            <span className="pm-price">
              ${displayPrice.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {hasBulk && purchaseType === "bulto" && product.unitPrice && (
              <span className="pm-unit-hint">
                ${product.unitPrice.toLocaleString("es-AR", { minimumFractionDigits: 2 })} / unidad
              </span>
            )}
          </div>

          {/* Quantity */}
          <div className="pm-section">
            <p className="pm-section-label">Cantidad:</p>
            <div className="pm-qty-ctrl">
              <button className="pm-qty-btn" onClick={() => changeQty(-1)} disabled={quantity <= 1}>−</button>
              <span className="pm-qty-num">{quantity}</span>
              <button className="pm-qty-btn" onClick={() => changeQty(1)}>+</button>
              <span className="pm-qty-unit">
                {purchaseType === "bulto" ? (bulkLabel + (sizeLabel || "s")) : "unidades"}
              </span>
            </div>
          </div>

          {/* Add to cart */}
          <button
            className={`pm-add-btn${added ? " pm-add-btn--added" : ""}`}
            onClick={handleAdd}
            disabled={added}
          >
            {added ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                ¡Agregado al carrito!
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                Agregar al carrito
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
