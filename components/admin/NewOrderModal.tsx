"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

/* ── Types ────────────────────────────────────────────────── */
type Client = {
  id: number;
  clientCode: string | null;
  name: string;
  company: string | null;
  email: string;
};

type Product = {
  id: number;
  code: string;
  name: string;
  price: number;
  imageUrl: string | null;
  bulkUnit: string | null;
  bulkSize: number | null;
  bulkPrice: number | null;
  unitPrice: number | null;
};

type Salesperson = {
  id: number;
  name: string;
  defaultCommission: number;
};

type CartItem = {
  product: Product;
  quantity: number;
  unitPrice: number;
  mode: "unit" | "bulk";
};

/* ── Props ────────────────────────────────────────────────── */
type Props = {
  onClose: () => void;
};

/* ── Modal ────────────────────────────────────────────────── */
export default function NewOrderModal({ onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  /* Step 1 state */
  const [clientQ, setClientQ] = useState("");
  const [clientResults, setClientResults] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [selectedSpId, setSelectedSpId] = useState<string>("");
  const [loadingClients, setLoadingClients] = useState(false);
  const clientDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Step 2 state */
  const [productQ, setProductQ] = useState("");
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const productDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Step 3 state */
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [shippingMethod, setShippingMethod] = useState("retiro");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  /* Load salespersons on mount */
  useEffect(() => {
    fetch("/api/admin/salespersons?status=active&limit=100")
      .then((r) => r.json())
      .then((d) => setSalespersons(d.salespersons ?? []));
  }, []);

  /* Client search */
  const searchClients = useCallback((q: string) => {
    if (!q.trim()) { setClientResults([]); return; }
    setLoadingClients(true);
    fetch(`/api/admin/clients?q=${encodeURIComponent(q)}&limit=8&status=approved`)
      .then((r) => r.json())
      .then((d) => { setClientResults(d.clients ?? []); setLoadingClients(false); });
  }, []);

  useEffect(() => {
    if (clientDebounce.current) clearTimeout(clientDebounce.current);
    clientDebounce.current = setTimeout(() => searchClients(clientQ), 300);
    return () => { if (clientDebounce.current) clearTimeout(clientDebounce.current); };
  }, [clientQ, searchClients]);

  /* Product search */
  const searchProducts = useCallback((q: string) => {
    if (!q.trim()) { setProductResults([]); return; }
    setLoadingProducts(true);
    fetch(`/api/admin/products?q=${encodeURIComponent(q)}&limit=8`)
      .then((r) => r.json())
      .then((d) => { setProductResults(d.products ?? []); setLoadingProducts(false); });
  }, []);

  useEffect(() => {
    if (productDebounce.current) clearTimeout(productDebounce.current);
    productDebounce.current = setTimeout(() => searchProducts(productQ), 300);
    return () => { if (productDebounce.current) clearTimeout(productDebounce.current); };
  }, [productQ, searchProducts]);

  /* Cart operations */
  function addToCart(product: Product, mode: "unit" | "bulk") {
    const unitPrice = mode === "bulk" && product.bulkPrice != null
      ? product.bulkPrice
      : product.unitPrice ?? product.price;
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id && i.mode === mode);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id && i.mode === mode
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { product, quantity: 1, unitPrice, mode }];
    });
    setProductQ("");
    setProductResults([]);
  }

  function updateQty(idx: number, delta: number) {
    setCart((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + delta };
      return updated.filter((i) => i.quantity > 0);
    });
  }

  function removeFromCart(idx: number) {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  }

  const cartTotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  /* Submit */
  async function submit() {
    if (cart.length === 0) { setSubmitError("Agregá al menos un producto."); return; }
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient?.id ?? null,
          clientCode: selectedClient?.clientCode ?? null,
          clientName: selectedClient?.name ?? null,
          salespersonId: selectedSpId ? parseInt(selectedSpId) : null,
          paymentMethod,
          shippingMethod,
          notes,
          items: cart.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Error al crear la orden");
        setSubmitting(false);
        return;
      }
      onClose();
      router.push(`/orders/${data.order.id}`);
      router.refresh();
    } catch {
      setSubmitError("Error de conexión. Intentá nuevamente.");
      setSubmitting(false);
    }
  }

  /* Step 1 valid? */
  const step1Valid = true; // client optional for walk-in sales

  return (
    <div className="nord-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="nord-modal">
        {/* ── Header ── */}
        <div className="nord-header">
          <div>
            <h2 className="nord-title">Nueva Orden de Venta</h2>
            <div className="nord-steps">
              {["Cliente", "Productos", "Confirmar"].map((label, i) => {
                const n = (i + 1) as 1 | 2 | 3;
                return (
                  <div key={n} className={`nord-step${step === n ? " nord-step--active" : step > n ? " nord-step--done" : ""}`}>
                    <div className="nord-step-dot">{step > n ? "✓" : n}</div>
                    <span className="nord-step-label">{label}</span>
                    {i < 2 && <div className="nord-step-line" />}
                  </div>
                );
              })}
            </div>
          </div>
          <button className="nord-close" onClick={onClose} title="Cerrar">✕</button>
        </div>

        {/* ── Body ── */}
        <div className="nord-body">

          {/* ────── STEP 1 ────── */}
          {step === 1 && (
            <div className="nord-section-wrap">
              <div className="nord-section">
                <h3 className="nord-section-title">Datos del cliente</h3>

                {/* Client search */}
                <div className="nord-field">
                  <label className="nord-label">Cliente <span className="nord-optional">(opcional — dejar vacío para venta sin cuenta)</span></label>
                  {selectedClient ? (
                    <div className="nord-selected-client">
                      <div className="nord-selected-info">
                        <span className="nord-selected-name">{selectedClient.name}</span>
                        {selectedClient.clientCode && (
                          <span className="nord-selected-code">[{selectedClient.clientCode}]</span>
                        )}
                        <span className="nord-selected-email">{selectedClient.email}</span>
                      </div>
                      <button
                        className="nord-btn-remove"
                        onClick={() => { setSelectedClient(null); setClientQ(""); }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="nord-autocomplete">
                      <input
                        className="nord-input"
                        placeholder="Buscar por nombre, código o email..."
                        value={clientQ}
                        onChange={(e) => setClientQ(e.target.value)}
                        autoFocus
                      />
                      {(clientResults.length > 0 || loadingClients) && (
                        <div className="nord-dropdown">
                          {loadingClients && <div className="nord-dropdown-loading">Buscando...</div>}
                          {clientResults.map((c) => (
                            <button
                              key={c.id}
                              className="nord-dropdown-item"
                              onClick={() => { setSelectedClient(c); setClientQ(""); setClientResults([]); }}
                            >
                              <span className="nord-dropdown-name">{c.name}</span>
                              {c.clientCode && <span className="nord-dropdown-code">[{c.clientCode}]</span>}
                              <span className="nord-dropdown-email">{c.email}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Salesperson */}
                <div className="nord-field">
                  <label className="nord-label">Vendedor <span className="nord-optional">(opcional)</span></label>
                  <select
                    className="nord-select"
                    value={selectedSpId}
                    onChange={(e) => setSelectedSpId(e.target.value)}
                  >
                    <option value="">Sin vendedor asignado</option>
                    {salespersons.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.defaultCommission}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ────── STEP 2 ────── */}
          {step === 2 && (
            <div className="nord-section-wrap">
              {/* Product search */}
              <div className="nord-section">
                <h3 className="nord-section-title">Agregar productos</h3>
                <div className="nord-autocomplete">
                  <input
                    className="nord-input"
                    placeholder="Buscar producto por nombre o código..."
                    value={productQ}
                    onChange={(e) => setProductQ(e.target.value)}
                    autoFocus
                  />
                  {(productResults.length > 0 || loadingProducts) && (
                    <div className="nord-dropdown nord-dropdown--products">
                      {loadingProducts && <div className="nord-dropdown-loading">Buscando...</div>}
                      {productResults.map((p) => (
                        <div key={p.id} className="nord-product-result">
                          {p.imageUrl && (
                            <img src={p.imageUrl} alt={p.name} className="nord-product-img" />
                          )}
                          <div className="nord-product-info">
                            <span className="nord-product-name">{p.name}</span>
                            <span className="nord-product-code">{p.code}</span>
                          </div>
                          <div className="nord-product-actions">
                            <button
                              className="nord-btn-add"
                              onClick={() => addToCart(p, "unit")}
                              title="Agregar por unidad"
                            >
                              + Unidad<br />
                              <span className="nord-btn-add-price">${(p.unitPrice ?? p.price).toLocaleString("es-AR")}</span>
                            </button>
                            {p.bulkPrice != null && p.bulkSize != null && (
                              <button
                                className="nord-btn-add nord-btn-add--bulk"
                                onClick={() => addToCart(p, "bulk")}
                                title={`Agregar x${p.bulkSize} (${p.bulkUnit ?? "pack"})`}
                              >
                                + x{p.bulkSize}<br />
                                <span className="nord-btn-add-price">${p.bulkPrice.toLocaleString("es-AR")}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Cart */}
              <div className="nord-section">
                <div className="nord-cart-header">
                  <h3 className="nord-section-title" style={{ margin: 0 }}>Carrito</h3>
                  {cartCount > 0 && (
                    <span className="nord-cart-badge">{cartCount} {cartCount === 1 ? "item" : "items"}</span>
                  )}
                </div>
                {cart.length === 0 ? (
                  <div className="nord-cart-empty">
                    Buscá productos arriba para agregarlos al pedido.
                  </div>
                ) : (
                  <div className="nord-cart-list">
                    {cart.map((item, idx) => (
                      <div key={idx} className="nord-cart-item">
                        <div className="nord-cart-item-info">
                          <span className="nord-cart-item-name">{item.product.name}</span>
                          <span className="nord-cart-item-detail">
                            {item.mode === "bulk"
                              ? `x${item.product.bulkSize} ${item.product.bulkUnit ?? "pack"} · $${item.unitPrice.toLocaleString("es-AR")}/pack`
                              : `Unidad · $${item.unitPrice.toLocaleString("es-AR")}`}
                          </span>
                        </div>
                        <div className="nord-cart-item-qty">
                          <button className="nord-qty-btn" onClick={() => updateQty(idx, -1)}>−</button>
                          <span className="nord-qty-val">{item.quantity}</span>
                          <button className="nord-qty-btn" onClick={() => updateQty(idx, +1)}>+</button>
                        </div>
                        <span className="nord-cart-item-sub">
                          ${(item.unitPrice * item.quantity).toLocaleString("es-AR")}
                        </span>
                        <button className="nord-btn-remove" onClick={() => removeFromCart(idx)}>✕</button>
                      </div>
                    ))}
                    <div className="nord-cart-total">
                      <span>Total</span>
                      <span className="nord-cart-total-val">${cartTotal.toLocaleString("es-AR")}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ────── STEP 3 ────── */}
          {step === 3 && (
            <div className="nord-section-wrap">
              {/* Summary */}
              <div className="nord-section">
                <h3 className="nord-section-title">Resumen del pedido</h3>
                <div className="nord-summary-client">
                  <span className="nord-summary-label">Cliente:</span>
                  <span>{selectedClient?.name ?? "Sin cuenta (venta presencial)"}</span>
                  {selectedClient?.clientCode && (
                    <span className="nord-selected-code">[{selectedClient.clientCode}]</span>
                  )}
                </div>
                {selectedSpId && (
                  <div className="nord-summary-client">
                    <span className="nord-summary-label">Vendedor:</span>
                    <span>{salespersons.find((s) => s.id === parseInt(selectedSpId))?.name}</span>
                  </div>
                )}
                <div className="nord-summary-items">
                  {cart.map((item, idx) => (
                    <div key={idx} className="nord-summary-row">
                      <span>{item.product.name} ×{item.quantity}</span>
                      <span>${(item.unitPrice * item.quantity).toLocaleString("es-AR")}</span>
                    </div>
                  ))}
                  <div className="nord-summary-total">
                    <span>Total</span>
                    <span>${cartTotal.toLocaleString("es-AR")}</span>
                  </div>
                </div>
              </div>

              {/* Payment & shipping */}
              <div className="nord-section">
                <h3 className="nord-section-title">Pago y entrega</h3>
                <div className="nord-row">
                  <div className="nord-field">
                    <label className="nord-label">Método de pago</label>
                    <select className="nord-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="cheque">Cheque</option>
                      <option value="mercadopago">Mercado Pago</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="cuenta_corriente">Cuenta corriente</option>
                    </select>
                  </div>
                  <div className="nord-field">
                    <label className="nord-label">Entrega</label>
                    <select className="nord-select" value={shippingMethod} onChange={(e) => setShippingMethod(e.target.value)}>
                      <option value="retiro">Retiro en local</option>
                      <option value="envio">Envío a domicilio</option>
                    </select>
                  </div>
                </div>
                <div className="nord-field">
                  <label className="nord-label">Notas <span className="nord-optional">(opcional)</span></label>
                  <textarea
                    className="nord-textarea"
                    rows={3}
                    placeholder="Observaciones, instrucciones especiales..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              {submitError && (
                <div className="nord-error">{submitError}</div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="nord-footer">
          <div className="nord-footer-left">
            {step > 1 && (
              <button
                className="nord-btn nord-btn--secondary"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                disabled={submitting}
              >
                ← Atrás
              </button>
            )}
          </div>
          <div className="nord-footer-right">
            {cart.length > 0 && step === 2 && (
              <span className="nord-footer-total">
                Total: <strong>${cartTotal.toLocaleString("es-AR")}</strong>
              </span>
            )}
            {step < 3 ? (
              <button
                className="nord-btn nord-btn--primary"
                onClick={() => {
                  if (step === 2 && cart.length === 0) return;
                  setStep((s) => (s + 1) as 1 | 2 | 3);
                }}
                disabled={step === 2 && cart.length === 0}
              >
                {step === 2 ? "Revisar pedido →" : "Agregar productos →"}
              </button>
            ) : (
              <button
                className="nord-btn nord-btn--primary"
                onClick={submit}
                disabled={submitting || cart.length === 0}
              >
                {submitting ? "Creando..." : "✓ Crear orden"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
