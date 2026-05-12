"use client";

import { useState, useEffect } from "react";
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

type PaymentMethod = "mercadopago" | "transferencia" | "efectivo";

type BankSettings = {
  bank_name: string;
  bank_holder: string;
  bank_cbu: string;
  bank_alias: string;
  bank_cuit: string;
  social_whatsapp: string;
  payment_efectivo: string;
  payment_transferencia: string;
  payment_mercadopago: string;
};

type OrderSuccess = {
  orderId: number;
  total: number;
  paymentMethod: PaymentMethod;
  shipping: string;
};

const STEPS = [
  { label: "Carrito",  icon: "🛍️" },
  { label: "Datos",    icon: "📋" },
  { label: "Pago",     icon: "💳" },
  { label: "Listo",    icon: "✅" },
];

const PAYMENT_METHODS = [
  {
    id: "mercadopago" as PaymentMethod,
    icon: "💳",
    label: "Mercado Pago",
    desc: "Tarjeta, débito, efectivo o transferencia MP",
  },
  {
    id: "transferencia" as PaymentMethod,
    icon: "🏦",
    label: "Transferencia bancaria",
    desc: "Transferí directo a nuestra cuenta y confirmamos",
  },
  {
    id: "efectivo" as PaymentMethod,
    icon: "💵",
    label: "Efectivo",
    desc: "Pagás al momento de la entrega o retiro",
  },
];

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const router = useRouter();

  const [form, setForm] = useState<Field>({
    name: "", email: "", phone: "",
    address: "", city: "", shipping: "envio", notes: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mercadopago");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderSuccess, setOrderSuccess] = useState<OrderSuccess | null>(null);
  const [bankSettings, setBankSettings] = useState<BankSettings>({
    bank_name: "", bank_holder: "", bank_cbu: "", bank_alias: "", bank_cuit: "",
    social_whatsapp: "541150179447",
    payment_efectivo: "true", payment_transferencia: "true", payment_mercadopago: "true",
  });

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.ok ? r.json() : null)
      .then(d => d?.settings && setBankSettings(prev => ({ ...prev, ...d.settings })))
      .catch(() => {});
  }, []);

  function update(field: keyof Field, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 1. Create order
    const orderRes = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map(i => ({ productId: i.id, quantity: i.quantity })),
        guestEmail: form.email,
        guestName: form.name,
        guestPhone: form.phone,
        shippingAddress: form.address,
        shippingCity: form.city,
        shippingMethod: form.shipping,
        notes: form.notes,
        paymentMethod,
      }),
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok) {
      setError(orderData.error ?? "Error al crear la orden");
      setLoading(false);
      return;
    }

    // 2. Branch by payment method
    if (paymentMethod === "mercadopago") {
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
      clearCart();
      window.location.href = mpData.sandboxInitPoint ?? mpData.initPoint;
      return;
    }

    // Efectivo / Transferencia: show success screen
    clearCart();
    setOrderSuccess({
      orderId: orderData.orderId,
      total: orderData.total,
      paymentMethod,
      shipping: form.shipping,
    });
    setLoading(false);
  }

  // ── Empty cart ──────────────────────────────────────────────
  if (items.length === 0 && !orderSuccess) {
    return (
      <div className="checkout-empty">
        <div className="emoji">🛒</div>
        <h2>Tu carrito está vacío</h2>
        <p>Agregá productos antes de ir al checkout.</p>
        <Link href="/" className="btn-back-catalog">← Volver al catálogo</Link>
      </div>
    );
  }

  // ── Success screen (efectivo / transferencia) ───────────────
  if (orderSuccess) {
    const wa = bankSettings.social_whatsapp || "541150179447";
    const waMsg = encodeURIComponent(`Hola, realicé la transferencia para el pedido #${orderSuccess.orderId} por $${orderSuccess.total.toLocaleString("es-AR")}.`);
    return (
      <div className="checkout-success-page">
        <div className="cs-card">
          <div className="cs-icon">✅</div>
          <h2 className="cs-title">¡Pedido #{orderSuccess.orderId} confirmado!</h2>

          {orderSuccess.paymentMethod === "efectivo" && (
            <>
              <p className="cs-sub">
                Tu pedido fue registrado. Abonás{" "}
                <strong>${orderSuccess.total.toLocaleString("es-AR")}</strong>{" "}
                en efectivo al momento del{" "}
                {orderSuccess.shipping === "retiro" ? "retiro en local" : "envío a domicilio"}.
              </p>
              <div className="cs-info-box">
                <span className="cs-info-icon">💵</span>
                <div>
                  <strong>Pago en efectivo</strong>
                  <p>Coordinamos la entrega y abonás en el momento. Te contactamos por email o WhatsApp para confirmar.</p>
                </div>
              </div>
            </>
          )}

          {orderSuccess.paymentMethod === "transferencia" && (
            <>
              <p className="cs-sub">
                Realizá la transferencia por{" "}
                <strong>${orderSuccess.total.toLocaleString("es-AR")}</strong>{" "}
                a los datos indicados y envianos el comprobante.
              </p>
              <div className="cs-bank-details">
                <h4>🏦 Datos para la transferencia</h4>
                <div className="cs-bank-grid">
                  {bankSettings.bank_name         && <><span>Banco</span>  <strong>{bankSettings.bank_name}</strong></>}
                  {bankSettings.bank_holder && <><span>Titular</span><strong>{bankSettings.bank_holder}</strong></>}
                  {bankSettings.bank_cbu           && (
                    <><span>CBU</span>
                    <strong className="cs-cbu" onClick={() => navigator.clipboard?.writeText(bankSettings.bank_cbu)}>
                      {bankSettings.bank_cbu} <span className="cs-copy-hint">📋</span>
                    </strong></>
                  )}
                  {bankSettings.bank_alias         && (
                    <><span>Alias</span>
                    <strong className="cs-cbu" onClick={() => navigator.clipboard?.writeText(bankSettings.bank_alias)}>
                      {bankSettings.bank_alias} <span className="cs-copy-hint">📋</span>
                    </strong></>
                  )}
                  {bankSettings.bank_cuit          && <><span>CUIT/DNI</span><strong>{bankSettings.bank_cuit}</strong></>}
                </div>
                {(!bankSettings.bank_cbu && !bankSettings.bank_alias) && (
                  <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>
                    Próximamente agregaremos los datos bancarios. Consultanos por WhatsApp.
                  </p>
                )}
              </div>
              <a
                href={`https://wa.me/${wa}?text=${waMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="cs-wa-btn"
              >
                💬 Enviar comprobante por WhatsApp
              </a>
            </>
          )}

          <div className="cs-actions">
            <Link href={`/orders/${orderSuccess.orderId}`} className="cs-btn cs-btn--secondary">
              Ver mi pedido
            </Link>
            <Link href="/" className="cs-btn cs-btn--primary">
              Seguir comprando
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Checkout form ───────────────────────────────────────────
  const currentStep = 1;

  return (
    <div className="checkout-page">

      {/* Steps */}
      <div className="checkout-steps">
        {STEPS.map((step, i) => (
          <div key={i} className="checkout-step-group">
            <div className={`checkout-step${i <= currentStep ? " checkout-step--done" : ""}${i === currentStep ? " checkout-step--current" : ""}`}>
              <span className="cstep-icon">{step.icon}</span>
              <span className="cstep-label">{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`cstep-line${i < currentStep ? " cstep-line--done" : ""}`} />
            )}
          </div>
        ))}
      </div>

      <div className="checkout-container">

        {/* ── FORMULARIO ── */}
        <div className="checkout-form-wrap">
          <Link href="/" className="checkout-back">← Seguir comprando</Link>
          <h1 className="checkout-title">Finalizar compra</h1>

          <form onSubmit={handleSubmit} className="checkout-form">

            {/* Datos personales */}
            <section className="form-section">
              <h3>Tus datos</h3>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Nombre completo *</label>
                  <input required value={form.name} onChange={e => update("name", e.target.value)} placeholder="Juan García" />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input required type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="juan@ejemplo.com" />
                </div>
              </div>
              <div className="form-group">
                <label>Teléfono</label>
                <input type="tel" value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="011 1234-5678" />
              </div>
            </section>

            {/* Dirección */}
            <section className="form-section">
              <h3>Dirección de envío</h3>
              <div className="form-group">
                <label>Dirección *</label>
                <input required value={form.address} onChange={e => update("address", e.target.value)} placeholder="Av. Mitre 1234, Piso 2" />
              </div>
              <div className="form-group">
                <label>Ciudad / Localidad *</label>
                <input required value={form.city} onChange={e => update("city", e.target.value)} placeholder="Tigre, Buenos Aires" />
              </div>
            </section>

            {/* Método de entrega */}
            <section className="form-section">
              <h3>Método de entrega</h3>
              <div className="shipping-options">
                <label className={`shipping-opt${form.shipping === "envio" ? " active" : ""}`}>
                  <input type="radio" name="shipping" value="envio" checked={form.shipping === "envio"} onChange={e => update("shipping", e.target.value)} />
                  <span className="shipping-icon">🚚</span>
                  <div><strong>Envío a domicilio</strong><small>2-3 días hábiles · Tigre y alrededores</small></div>
                </label>
                <label className={`shipping-opt${form.shipping === "retiro" ? " active" : ""}`}>
                  <input type="radio" name="shipping" value="retiro" checked={form.shipping === "retiro"} onChange={e => update("shipping", e.target.value)} />
                  <span className="shipping-icon">🏪</span>
                  <div><strong>Retiro en local</strong><small>Coordinar horario · Sin costo</small></div>
                </label>
              </div>
            </section>

            {/* ── MÉTODO DE PAGO ── */}
            <section className="form-section">
              <h3>Método de pago</h3>
              <div className="payment-methods">
                {PAYMENT_METHODS.filter(pm =>
                  bankSettings[`payment_${pm.id}` as keyof BankSettings] !== "false"
                ).map(pm => (
                  <label
                    key={pm.id}
                    className={`payment-opt${paymentMethod === pm.id ? " active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={pm.id}
                      checked={paymentMethod === pm.id}
                      onChange={() => setPaymentMethod(pm.id)}
                    />
                    <span className="payment-icon">{pm.icon}</span>
                    <div>
                      <strong>{pm.label}</strong>
                      <small>{pm.desc}</small>
                    </div>
                  </label>
                ))}
              </div>

              {/* Preview de datos bancarios si elige transferencia */}
              {paymentMethod === "transferencia" && (bankSettings.bank_cbu || bankSettings.bank_alias) && (
                <div className="payment-bank-preview">
                  <p>💡 Al confirmar te mostramos los datos de la cuenta para transferir.</p>
                </div>
              )}
            </section>

            <div className="form-group">
              <label>Notas (opcional)</label>
              <textarea value={form.notes} onChange={e => update("notes", e.target.value)} placeholder="Instrucciones especiales, referencias de entrega..." rows={2} />
            </div>

            {error && <div className="checkout-error">⚠️ {error}</div>}

            <button type="submit" className="btn-pay" disabled={loading}>
              {loading ? "Procesando..." : (
                paymentMethod === "mercadopago"    ? `🔒 Pagar con Mercado Pago · $${total.toLocaleString("es-AR")}` :
                paymentMethod === "transferencia"  ? `🏦 Confirmar y ver datos · $${total.toLocaleString("es-AR")}` :
                                                    `💵 Confirmar pedido · $${total.toLocaleString("es-AR")}`
              )}
            </button>

            <p className="checkout-disclaimer">
              {paymentMethod === "mercadopago"
                ? "Al hacer clic vas a ser redirigido a Mercado Pago para completar el pago de forma segura."
                : paymentMethod === "transferencia"
                  ? "Al confirmar te mostramos los datos bancarios para realizar la transferencia."
                  : "Al confirmar registramos tu pedido. Abonás en efectivo al recibirlo."}
            </p>
          </form>
        </div>

        {/* ── RESUMEN ── */}
        <aside className="order-summary">
          <h3>Tu pedido</h3>
          <div className="summary-items">
            {items.map(item => (
              <div key={item.id} className="summary-item">
                <span className="s-emoji">{item.emoji}</span>
                <div className="s-info">
                  <span className="s-name">{item.name}</span>
                  <span className="s-qty">× {item.quantity}</span>
                </div>
                <span className="s-price">${(item.price * item.quantity).toLocaleString("es-AR")}</span>
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
            <span>Compra 100% segura</span>
          </div>
          <div className="summary-methods">
            <span title="Mercado Pago">💳</span>
            <span title="Transferencia">🏦</span>
            <span title="Efectivo">💵</span>
          </div>
        </aside>

      </div>
    </div>
  );
}
