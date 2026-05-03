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

function fmt(n: number) {
  return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Inline SVG icons ─────────────────────────────────────
function IconUnit() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27,6.96 12,12.01 20.73,6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  );
}
function IconBulk() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h20"/><path d="M4 20V10l8-7 8 7v10"/><path d="M10 20v-6h4v6"/>
      <path d="M14 14h2v-2h-2zm-4 0h2v-2H10z"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20,6 9,17 4,12"/>
    </svg>
  );
}
// ─────────────────────────────────────────────────────────

type Props = {
  product: Product | null;
  onClose: () => void;
};

export default function ProductModal({ product, onClose }: Props) {
  const { addItem } = useCart();
  const [imgError, setImgError]         = useState(false);
  const [added, setAdded]               = useState(false);
  const [quantity, setQuantity]         = useState(1);

  const hasBulk = !!(product?.bulkPrice && product?.unitPrice);
  const [purchaseType, setPurchaseType] = useState<PurchaseType>("bulto");

  useEffect(() => {
    setImgError(false);
    setAdded(false);
    setQuantity(1);
    setPurchaseType(hasBulk ? "bulto" : "unidad");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

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

  const bulkLabel  = product.bulkUnit ?? "Bulto";
  const bulkSize   = product.bulkSize ?? 1;
  const bulkPrice  = product.bulkPrice ?? product.price;
  const unitPrice  = product.unitPrice ?? product.price;

  const displayPrice = hasBulk
    ? (purchaseType === "bulto" ? bulkPrice : unitPrice)
    : product.price;

  const hasImage = product.imageUrl && !imgError;
  const imgSrc   = hasImage ? cloudinaryLarge(product.imageUrl!) : null;

  function handleAdd() {
    for (let i = 0; i < quantity; i++) {
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
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  function changeQty(delta: number) {
    setQuantity(q => Math.max(1, q + delta));
  }

  return (
    <div className="pm-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={product.name}>
      <div className="pm-card" onClick={e => e.stopPropagation()}>

        {/* ── Close ── */}
        <button className="pm-close" onClick={onClose} aria-label="Cerrar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* ── Image ── */}
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

        {/* ── Info ── */}
        <div className="pm-info-col">

          <div className="pm-cat-badge">
            <span>{product.category?.emoji ?? "📦"}</span>
            {product.category?.name ?? "General"}
          </div>

          <h2 className="pm-name">{product.name}</h2>
          <p className="pm-code">Código: <strong>{product.code}</strong></p>

          <div className="pm-divider" />

          {/* ── SELECTOR VISUAL BULTO / UNIDAD ── */}
          {hasBulk ? (
            <div className="pm-option-section">
              <p className="pm-section-label">¿Cómo querés comprar?</p>
              <div className="pm-options">

                {/* Opción UNIDAD */}
                <button
                  className={`pm-option${purchaseType === "unidad" ? " pm-option--active" : ""}`}
                  onClick={() => { setPurchaseType("unidad"); setQuantity(1); }}
                >
                  {purchaseType === "unidad" && (
                    <span className="pm-option-check"><IconCheck /></span>
                  )}
                  <span className="pm-option-icon"><IconUnit /></span>
                  <span className="pm-option-label">Unidad</span>
                  <span className="pm-option-price">${fmt(unitPrice)}</span>
                  <span className="pm-option-desc">precio por unidad</span>
                </button>

                {/* Opción BULTO */}
                <button
                  className={`pm-option${purchaseType === "bulto" ? " pm-option--active" : ""}`}
                  onClick={() => { setPurchaseType("bulto"); setQuantity(1); }}
                >
                  {purchaseType === "bulto" && (
                    <span className="pm-option-check"><IconCheck /></span>
                  )}
                  <span className="pm-option-icon"><IconBulk /></span>
                  <span className="pm-option-label">{bulkLabel}</span>
                  <span className="pm-option-price">${fmt(bulkPrice)}</span>
                  <span className="pm-option-desc">
                    {bulkSize > 1 ? `${bulkSize} unidades · $${fmt(unitPrice)}/un` : "precio por bulto"}
                  </span>
                </button>

              </div>
            </div>
          ) : (
            /* Sin bulk: precio simple */
            <div className="pm-price-block">
              <span className="pm-price-label">Precio mayorista</span>
              <span className="pm-price">${fmt(product.price)}</span>
            </div>
          )}

          {/* ── CANTIDAD ── */}
          <div className="pm-qty-section">
            <p className="pm-section-label">
              Cantidad de {purchaseType === "bulto" ? `${bulkLabel.toLowerCase()}s` : "unidades"}:
            </p>
            <div className="pm-qty-row">
              <div className="pm-qty-ctrl">
                <button className="pm-qty-btn" onClick={() => changeQty(-1)} disabled={quantity <= 1}>−</button>
                <span className="pm-qty-num">{quantity}</span>
                <button className="pm-qty-btn" onClick={() => changeQty(1)}>+</button>
              </div>
              {hasBulk && (
                <span className="pm-qty-total">
                  Total: <strong>${fmt(displayPrice * quantity)}</strong>
                  {purchaseType === "bulto" && bulkSize > 1 && (
                    <> · {quantity * bulkSize} unidades</>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* ── AGREGAR ── */}
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
                Agregar {quantity > 1 ? `(${quantity})` : ""} al carrito
              </>
            )}
          </button>

        </div>
      </div>
    </div>
  );
}
