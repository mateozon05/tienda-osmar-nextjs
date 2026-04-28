"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart";

type Field = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  shipping: string;
  notes: string;
};

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const router = useRouter();

  const [form, setForm] = useState<Field>({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    shipping: "envio",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(field: keyof Field, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 1. Create order (prices validated server-side from DB)
    const orderRes = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({ productId: i.id, quantity: i.quantity })),
        guestEmail: form.email,
        guestName: form.name,
        guestPhone: form.phone,
        shippingAddress: form.address,
        shippingCity: form.city,
        shippingMethod: form.shipping,
        notes: form.notes,
      }),
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok) {
      setError(orderData.error ?? "Error al crear la orden");
      setLoading(false);
      return;
    }

    // 2. Get Mercado Pago preference
    const mpRes = await fetch("/api/checkout/mercadopago", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: orderData.orderId }),
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      setError(mpData.error ?? "Error al conectar con Mercado Pago");
      setLoading(false);
      return;
    }

    // 3. Clear cart and redirect to MP sandbox
    clearCart();
    window.location.href = mpData.sandboxInitPoint ?? mpData.initPoint;
  }

  if (items.length === 0) {
    return (
      <div className="checkout-empty">
        <div className="emoji">🛒</div>
        <h2>Tu carrito está vacío</h2>
        <p>Agregá productos antes de ir al checkout.</p>
        <Link href="/" className="btn-back-catalog">← Volver al catálogo</Link>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">

        {/* ── FORMULARIO ── */}
        <div className="checkout-form-wrap">
          <Link href="/" className="checkout-back">← Seguir comprando</Link>
          <h1 className="checkout-title">Finalizar compra</h1>

          <form onSubmit={handleSubmit} className="checkout-form">

            <section className="form-section">
              <h3>Tus datos</h3>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Nombre completo *</label>
                  <input required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Juan García" />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="juan@ejemplo.com" />
                </div>
              </div>
              <div className="form-group">
                <label>Teléfono</label>
                <input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="011 1234-5678" />
              </div>
            </section>

            <section className="form-section">
              <h3>Dirección de envío</h3>
              <div className="form-group">
                <label>Dirección *</label>
                <input required value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Av. Mitre 1234, Piso 2" />
              </div>
              <div className="form-group">
                <label>Ciudad / Localidad *</label>
                <input required value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Tigre, Buenos Aires" />
              </div>
            </section>

            <section className="form-section">
              <h3>Método de entrega</h3>
              <div className="shipping-options">
                <label className={`shipping-opt${form.shipping === "envio" ? " active" : ""}`}>
                  <input type="radio" name="shipping" value="envio" checked={form.shipping === "envio"} onChange={(e) => update("shipping", e.target.value)} />
                  <span className="shipping-icon">🚚</span>
                  <div>
                    <strong>Envío a domicilio</strong>
                    <small>2-3 días hábiles · Tigre y alrededores</small>
                  </div>
                </label>
                <label className={`shipping-opt${form.shipping === "retiro" ? " active" : ""}`}>
                  <input type="radio" name="shipping" value="retiro" checked={form.shipping === "retiro"} onChange={(e) => update("shipping", e.target.value)} />
                  <span className="shipping-icon">🏪</span>
                  <div>
                    <strong>Retiro en local</strong>
                    <small>Coordinar horario · Sin costo</small>
                  </div>
                </label>
              </div>
            </section>

            <div className="form-group">
              <label>Notas (opcional)</label>
              <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Instrucciones especiales, referencias de entrega..." rows={2} />
            </div>

            {error && <div className="checkout-error">⚠️ {error}</div>}

            <button type="submit" className="btn-pay" disabled={loading}>
              {loading ? (
                <span>Procesando...</span>
              ) : (
                <span>🔒 Pagar con Mercado Pago · ${total.toLocaleString("es-AR")}</span>
              )}
            </button>

            <p className="checkout-disclaimer">
              Al hacer clic vas a ser redirigido a Mercado Pago para completar el pago de forma segura.
            </p>
          </form>
        </div>

        {/* ── RESUMEN ── */}
        <aside className="order-summary">
          <h3>Tu pedido</h3>
          <div className="summary-items">
            {items.map((item) => (
              <div key={item.id} className="summary-item">
                <span className="s-emoji">{item.emoji}</span>
                <div className="s-info">
                  <span className="s-name">{item.name}</span>
                  <span className="s-qty">× {item.quantity}</span>
                </div>
                <span className="s-price">
                  ${(item.price * item.quantity).toLocaleString("es-AR")}
                </span>
              </div>
            ))}
          </div>
          <div className="summary-divider" />
          <div className="summary-total">
            <span>Total</span>
            <strong>${total.toLocaleString("es-AR")}</strong>
          </div>
          <div className="summary-badge">
            <span>🔒</span>
            <span>Pago 100% seguro con Mercado Pago</span>
          </div>
          <div className="summary-methods">
            <span title="Tarjeta de crédito">💳</span>
            <span title="Débito">🏧</span>
            <span title="Efectivo">💵</span>
            <span title="Transferencia">🏦</span>
          </div>
        </aside>

      </div>
    </div>
  );
}
