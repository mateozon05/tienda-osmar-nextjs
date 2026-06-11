"use client";

import { useState } from "react";
import type { CartItem } from "@/lib/cart";
import { useCart } from "@/lib/cart";

const WA_NUMBER = "541150179447";
const WA_COLOR  = "#25D366";
const WA_DARK   = "#1da851";

type Delivery = "retiro" | "envio";
type Payment  = "efectivo" | "transferencia" | "mercadopago";

interface Props {
  items: CartItem[];
  total: number;
  onClose: () => void;
}

const PAYMENT_OPTIONS: { id: Payment; icon: string; label: string; sub: string }[] = [
  { id: "efectivo",      icon: "💵", label: "Efectivo",       sub: "Al momento de la entrega" },
  { id: "transferencia", icon: "🏦", label: "Transferencia",  sub: "Te enviamos los datos bancarios" },
  { id: "mercadopago",   icon: "💳", label: "Mercado Pago",   sub: "Tarjeta, débito o saldo MP" },
];

export default function WhatsAppCheckoutModal({ items, total, onClose }: Props) {
  const { clearCart } = useCart();

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [payment,  setPayment]  = useState<Payment  | null>(null);
  const [address,  setAddress]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const canContinue =
    delivery !== null &&
    payment  !== null &&
    (delivery === "retiro" || address.trim() !== "");

  // ── Armar URL de WhatsApp (sin awaits) ──────────────────────────────────────
  function buildWhatsAppUrl(): string {
    const productLines = items
      .map((i) => {
        const typeLabel =
          i.purchaseType === "bulto"
            ? `${i.bulkUnit ?? "bulto"}${i.bulkSize ? ` ×${i.bulkSize}` : ""}`
            : "unidad";
        return `▸ [${i.code}] ${i.name}\n   Cantidad: ${i.quantity} ${typeLabel}`;
      })
      .join("\n");

    const deliveryText =
      delivery === "retiro"
        ? "🏪 *Retiro en local* (Av. Cazón 464, Tigre)"
        : `🚚 *Envío a domicilio*\n📍 ${address}`;

    const paymentLabels: Record<Payment, string> = {
      efectivo:      "💵 Efectivo",
      transferencia: "🏦 Transferencia bancaria",
      mercadopago:   "💳 Mercado Pago",
    };

    const message =
      `🛍️ *NUEVO PEDIDO - Distribuidora Osmar*\n\n` +
      `📦 *Productos:*\n${productLines}\n\n` +
      `💰 *Total estimado: $${total.toLocaleString("es-AR")}*\n\n` +
      `${deliveryText}\n\n` +
      `💳 *Forma de pago:* ${paymentLabels[payment!]}`;

    return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
  }

  function handleSend() {
    if (!canContinue || loading) return;
    setLoading(true);
    setError("");

    // ── PASO 1: Armar URL ANTES de cualquier async ────────────────────────────
    // Los browsers mobile bloquean window.open() si hay un await previo
    // (el "user gesture" se considera consumido después del primer await).
    const waUrl = buildWhatsAppUrl();

    // ── PASO 2: Guardar en BD sin await (fire-and-forget) ─────────────────────
    fetch("/api/cart/submit-whatsapp-order", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({
          productId:    i.id,
          code:         i.code,
          name:         i.name,
          quantity:     i.quantity,
          price:        i.price,
          purchaseType: i.purchaseType,
        })),
        delivery,
        address,
        paymentMethod: payment,
      }),
    }).catch((err) => console.error("[WA] Error guardando pedido:", err));
    // No await → el pedido se guarda async, sin bloquear el gesto del usuario

    // ── PASO 3: Abrir WhatsApp INMEDIATAMENTE ────────────────────────────────
    // window.location.href es más compatible en mobile que window.open()
    window.location.href = waUrl;

    // ── PASO 4: Limpiar y cerrar ─────────────────────────────────────────────
    clearCart();
    onClose();
    setLoading(false);
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,.65)",
          backdropFilter: "blur(4px)",
          zIndex: 200,
          display: "flex", alignItems: "flex-end",
        }}
      >
        {/* Panel */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: 480,
            margin: "0 auto",
            background: "#fff",
            borderRadius: "20px 20px 0 0",
            boxShadow: "0 -8px 40px rgba(0,0,0,.18)",
            display: "flex", flexDirection: "column",
            maxHeight: "92dvh", overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 20px 16px",
            borderBottom: `3px solid ${WA_COLOR}`,
            flexShrink: 0,
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#111" }}>
                Completar pedido
              </div>
              <div style={{ fontSize: ".78rem", color: "#888", marginTop: 2 }}>
                Antes de enviar por WhatsApp
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                border: "none", background: "#f3f3f3",
                cursor: "pointer", fontSize: "1rem", color: "#666",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >✕</button>
          </div>

          {/* Scrollable body */}
          <div style={{ overflowY: "auto", padding: "20px", flex: 1 }}>

            {/* Error */}
            {error && (
              <div style={{
                background: "#fef2f2", border: "1px solid #fca5a5",
                color: "#b91c1c", padding: "10px 14px",
                borderRadius: 10, marginBottom: 16, fontSize: 13,
              }}>
                {error}
              </div>
            )}

            {/* ── ENTREGA ── */}
            <div style={{ marginBottom: 22 }}>
              <div style={{
                fontSize: ".7rem", fontWeight: 700, color: "#999",
                letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10,
              }}>
                ¿Cómo retirás el pedido?
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {(["retiro", "envio"] as Delivery[]).map((opt) => {
                  const sel = delivery === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setDelivery(opt)}
                      style={{
                        padding: "14px 12px", borderRadius: 14,
                        border: `2px solid ${sel ? WA_COLOR : "#e5e5e5"}`,
                        background: sel ? "#f0fdf4" : "#fff",
                        cursor: "pointer", textAlign: "left",
                        transition: "border-color .15s, background .15s",
                      }}
                    >
                      <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>
                        {opt === "retiro" ? "🏪" : "🚚"}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: ".85rem", color: "#111" }}>
                        {opt === "retiro" ? "Retiro en local" : "Envío a domicilio"}
                      </div>
                      <div style={{ fontSize: ".72rem", color: "#888", marginTop: 2 }}>
                        {opt === "retiro" ? "Av. Cazón 464, Tigre" : "Coordinar con Osmar"}
                      </div>
                    </button>
                  );
                })}
              </div>

              {delivery === "envio" && (
                <input
                  autoFocus
                  type="text"
                  placeholder="Ingresá tu dirección de entrega..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={{
                    marginTop: 10, width: "100%", boxSizing: "border-box",
                    padding: "10px 14px",
                    border: `2px solid ${address.trim() ? WA_COLOR : "#e5e5e5"}`,
                    borderRadius: 12, fontSize: ".88rem",
                    outline: "none", fontFamily: "inherit",
                    transition: "border-color .15s",
                  }}
                />
              )}
            </div>

            {/* ── PAGO ── */}
            <div style={{ marginBottom: 22 }}>
              <div style={{
                fontSize: ".7rem", fontWeight: 700, color: "#999",
                letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10,
              }}>
                ¿Cómo abonás?
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {PAYMENT_OPTIONS.map((opt) => {
                  const sel = payment === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setPayment(opt.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 14px", borderRadius: 14,
                        border: `2px solid ${sel ? WA_COLOR : "#e5e5e5"}`,
                        background: sel ? "#f0fdf4" : "#fff",
                        cursor: "pointer", textAlign: "left",
                        transition: "border-color .15s, background .15s",
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: "50%",
                        border: `2px solid ${sel ? WA_COLOR : "#ccc"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        {sel && <div style={{ width: 9, height: 9, borderRadius: "50%", background: WA_COLOR }} />}
                      </div>
                      <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{opt.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: ".88rem", color: "#111" }}>{opt.label}</div>
                        <div style={{ fontSize: ".72rem", color: "#888" }}>{opt.sub}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── RESUMEN ── */}
            <div style={{
              background: "#f8f8f8", borderRadius: 14, padding: "14px 16px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontSize: ".85rem", color: "#666" }}>
                {items.reduce((s, i) => s + i.quantity, 0)} artículo{items.reduce((s, i) => s + i.quantity, 0) !== 1 ? "s" : ""}
              </span>
              <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#111" }}>
                ${total.toLocaleString("es-AR")}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: "16px 20px 20px", flexShrink: 0, borderTop: "1px solid #f0f0f0" }}>
            <button
              onClick={handleSend}
              disabled={!canContinue || loading}
              style={{
                width: "100%",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                padding: "15px", borderRadius: 14, border: "none",
                background: canContinue && !loading ? WA_COLOR : "#e5e5e5",
                color: canContinue && !loading ? "#fff" : "#aaa",
                fontWeight: 700, fontSize: ".95rem",
                cursor: canContinue && !loading ? "pointer" : "not-allowed",
                transition: "background .15s",
              }}
              onMouseEnter={(e) => {
                if (canContinue && !loading) (e.currentTarget as HTMLButtonElement).style.background = WA_DARK;
              }}
              onMouseLeave={(e) => {
                if (canContinue && !loading) (e.currentTarget as HTMLButtonElement).style.background = WA_COLOR;
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: 18, height: 18,
                    border: "2.5px solid rgba(255,255,255,.4)", borderTopColor: "#fff",
                    borderRadius: "50%", display: "inline-block",
                    animation: "waSpinM .7s linear infinite",
                  }} />
                  Guardando pedido...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                  </svg>
                  Enviar pedido por WhatsApp
                </>
              )}
            </button>
            <p style={{ fontSize: ".72rem", color: "#aaa", textAlign: "center", marginTop: 8 }}>
              Tu pedido queda registrado y se abre WhatsApp automáticamente
            </p>
            {/* Fallback para mobile: link directo si window.location.href no disparó */}
            {canContinue && !loading && (
              <p style={{ textAlign: "center", marginTop: 6 }}>
                <a
                  href={buildWhatsAppUrl()}
                  style={{
                    fontSize: ".72rem",
                    color: WA_COLOR,
                    textDecoration: "underline",
                  }}
                >
                  ¿No se abrió WhatsApp? Tocá acá
                </a>
              </p>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes waSpinM { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
