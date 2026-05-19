"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

/* ── Types ────────────────────────────────────────────────── */
type Client    = { id: number; clientCode: string | null; name: string; company: string | null; email: string };
type Product   = { id: number; code: string; name: string; price: number; imageUrl: string | null; bulkUnit: string | null; bulkSize: number | null; bulkPrice: number | null; unitPrice: number | null };
type Salesperson = { id: number; name: string; defaultCommission: number };
type CartItem  = { product: Product; quantity: number; unitPrice: number; mode: "unit" | "bulk" };
type Step      = "client" | "products" | "confirm";
type Props     = { onClose: () => void; onCreated?: () => void };

/* ── Design tokens ────────────────────────────────────────── */
const C   = "#FF751F";   // orange-500
const CD  = "#E55100";   // orange-600 (hover)
const G9  = "#1A1A2E";   // gray-900  (text)
const G7  = "#374151";   // gray-700
const G5  = "#6B7280";   // gray-500
const G4  = "#9CA3AF";   // gray-400
const G2  = "#E5E7EB";   // gray-200  (border)
const G1  = "#F3F4F6";   // gray-100
const G05 = "#F9FAFB";   // gray-50

/* ── Modal ────────────────────────────────────────────────── */
export default function NewOrderModal({ onClose, onCreated }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("client");

  /* Step 1 */
  const [clientQ, setClientQ]           = useState("");
  const [clientResults, setClientResults] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [salespersons, setSalespersons]   = useState<Salesperson[]>([]);
  const [selectedSpId, setSelectedSpId]   = useState("");
  const [loadingClients, setLoadingClients] = useState(false);
  const clientTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Step 2 */
  const [productQ, setProductQ]         = useState("");
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [cart, setCart]                 = useState<CartItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const productTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Step 3 */
  const [notes, setNotes]               = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [submitError, setSubmitError]   = useState("");

  useEffect(() => {
    fetch("/api/admin/salespersons?status=active&limit=100")
      .then((r) => r.json())
      .then((d) => setSalespersons(d.salespersons ?? []));
  }, []);

  const searchClients = useCallback((q: string) => {
    if (!q.trim()) { setClientResults([]); return; }
    setLoadingClients(true);
    fetch(`/api/admin/clients?q=${encodeURIComponent(q)}&limit=8&status=approved`)
      .then((r) => r.json())
      .then((d) => { setClientResults(d.clients ?? []); setLoadingClients(false); });
  }, []);
  useEffect(() => {
    if (clientTimer.current) clearTimeout(clientTimer.current);
    clientTimer.current = setTimeout(() => searchClients(clientQ), 300);
    return () => { if (clientTimer.current) clearTimeout(clientTimer.current); };
  }, [clientQ, searchClients]);

  const searchProducts = useCallback((q: string) => {
    if (!q.trim()) { setProductResults([]); return; }
    setLoadingProducts(true);
    fetch(`/api/admin/products?q=${encodeURIComponent(q)}&limit=8`)
      .then((r) => r.json())
      .then((d) => { setProductResults(d.products ?? []); setLoadingProducts(false); });
  }, []);
  useEffect(() => {
    if (productTimer.current) clearTimeout(productTimer.current);
    productTimer.current = setTimeout(() => searchProducts(productQ), 300);
    return () => { if (productTimer.current) clearTimeout(productTimer.current); };
  }, [productQ, searchProducts]);

  function addToCart(product: Product, mode: "unit" | "bulk") {
    const unitPrice = mode === "bulk" && product.bulkPrice != null ? product.bulkPrice : product.unitPrice ?? product.price;
    setCart((prev) => {
      const ex = prev.find((i) => i.product.id === product.id && i.mode === mode);
      if (ex) return prev.map((i) => i.product.id === product.id && i.mode === mode ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1, unitPrice, mode }];
    });
    setProductQ(""); setProductResults([]);
  }
  function updateQty(idx: number, delta: number) {
    setCart((prev) => prev.map((i, n) => n === idx ? { ...i, quantity: i.quantity + delta } : i).filter((i) => i.quantity > 0));
  }
  function removeFromCart(idx: number) { setCart((prev) => prev.filter((_, i) => i !== idx)); }

  const cartTotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const stepIdx   = ["client", "products", "confirm"].indexOf(step);

  async function submit() {
    if (!cart.length) { setSubmitError("Agregá al menos un producto."); return; }
    setSubmitting(true); setSubmitError("");
    try {
      const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      const res = await fetch("/api/admin/picking-notes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId:        selectedClient?.id       ?? null,
          clientCode:      selectedClient?.clientCode ?? null,
          clientName:      selectedClient?.name      ?? null,
          salespersonId:   selectedSpId ? parseInt(selectedSpId) : null,
          salespersonName: salespersons.find((s) => s.id === parseInt(selectedSpId))?.name ?? null,
          notes,
          subtotal,
          tax:   0,
          total: subtotal,
          items: cart.map((i) => ({
            productId: i.product.id,
            code:      i.product.code,
            name:      i.product.name,
            quantity:  i.quantity,
            unitPrice: i.unitPrice,
            type:      i.mode === "bulk" ? "bulto" : "unidad",
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error ?? "Error al crear la nota de pedido"); setSubmitting(false); return; }
      if (onCreated) {
        onCreated();
      } else {
        onClose();
        router.push(`/picking-notes/${data.note.id}`);
        router.refresh();
      }
    } catch { setSubmitError("Error de conexión. Intentá nuevamente."); setSubmitting(false); }
  }

  /* ── shared input style ─────────────────────────────────── */
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", border: `2px solid ${G2}`, borderRadius: 10,
    background: "#fff", color: G9, fontSize: 14, outline: "none", transition: "border-color .15s",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 700, color: C,
    textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6,
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999, display: "flex",
        alignItems: "center", justifyContent: "center", padding: 20,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
      }}
    >
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 680,
        maxHeight: "90vh", display: "flex", flexDirection: "column",
        boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
      }}>

        {/* ── HEADER ── */}
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          padding: "20px 24px", borderBottom: `2px solid ${C}`,
          borderRadius: "16px 16px 0 0", background: "#fff", flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: G9, margin: 0 }}>📋 Nueva Nota de Pedido</h2>
            <p style={{ fontSize: 13, color: G4, marginTop: 3, marginBottom: 0 }}>El depósito deberá confirmar la preparación antes de crear la Orden de Venta</p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: "50%", border: "none",
              background: "none", cursor: "pointer", color: G4, fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background .15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = G1)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            ✕
          </button>
        </div>

        {/* ── STEPS ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 24px",
          background: G05, borderBottom: `1px solid ${G2}`, flexShrink: 0,
        }}>
          {[{ id: "client", num: 1, label: "Cliente" }, { id: "products", num: 2, label: "Productos" }, { id: "confirm", num: 3, label: "Confirmar" }].map((s, i) => {
            const isActive = step === s.id;
            const isDone = stepIdx > i;
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                  background: isActive ? C : isDone ? "#FFF0E6" : "transparent",
                  color: isActive ? "#fff" : isDone ? C : G4,
                  transition: "all .2s",
                }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: "50%", display: "flex",
                    alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700,
                    background: isActive ? "#fff" : isDone ? C : G2,
                    color: isActive ? C : isDone ? "#fff" : G5,
                  }}>
                    {isDone ? "✓" : s.num}
                  </span>
                  {s.label}
                </div>
                {i < 2 && <span style={{ color: G2, fontSize: 14 }}>→</span>}
              </div>
            );
          })}
        </div>

        {/* ── BODY ── */}
        <div style={{ flex: 1, overflowY: "auto", background: "#fff" }}>

          {/* ─── STEP 1: Cliente ─── */}
          {step === "client" && (
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Client search */}
              <div>
                <label style={labelStyle}>
                  Cliente{" "}
                  <span style={{ color: G4, textTransform: "none", fontWeight: 400, letterSpacing: 0 }}>
                    (opcional — dejar vacío para venta sin cuenta)
                  </span>
                </label>
                {selectedClient ? (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", background: "#F0FDF4", border: "2px solid #BBF7D0",
                    borderRadius: 10, gap: 10,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, color: G9, fontSize: 14 }}>{selectedClient.name}</span>
                      {selectedClient.clientCode && (
                        <span style={{ fontSize: 12, background: G1, color: G5, borderRadius: 4, padding: "1px 6px" }}>[{selectedClient.clientCode}]</span>
                      )}
                      <span style={{ fontSize: 13, color: G4 }}>{selectedClient.email}</span>
                    </div>
                    <button
                      onClick={() => { setSelectedClient(null); setClientQ(""); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: G4, fontSize: 14, fontWeight: 700, padding: 4 }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = G4)}
                    >✕</button>
                  </div>
                ) : (
                  <div style={{ position: "relative" }}>
                    <input
                      autoFocus
                      style={inputStyle}
                      placeholder="Buscar por nombre, código o email..."
                      value={clientQ}
                      onChange={(e) => setClientQ(e.target.value)}
                      onFocus={(e) => { e.target.style.borderColor = C; e.target.style.boxShadow = `0 0 0 3px rgba(255,117,31,0.15)`; }}
                      onBlur={(e)  => { e.target.style.borderColor = G2; e.target.style.boxShadow = "none"; }}
                    />
                    {(clientResults.length > 0 || loadingClients) && (
                      <div style={{
                        position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
                        background: "#fff", border: `1px solid ${G2}`, borderRadius: 10,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxHeight: 224, overflowY: "auto",
                      }}>
                        {loadingClients && <div style={{ padding: "10px 14px", fontSize: 13, color: G4 }}>Buscando...</div>}
                        {clientResults.map((c) => (
                          <button key={c.id} onClick={() => { setSelectedClient(c); setClientQ(""); setClientResults([]); }}
                            style={{
                              width: "100%", textAlign: "left", padding: "10px 14px",
                              background: "none", border: "none", borderBottom: `1px solid ${G2}`,
                              cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 13,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#FFF7F0")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                          >
                            <span style={{ fontWeight: 600, color: G9, flex: 1 }}>{c.name}</span>
                            {c.clientCode && <span style={{ fontSize: 11, background: G1, color: G5, borderRadius: 4, padding: "1px 5px" }}>[{c.clientCode}]</span>}
                            <span style={{ fontSize: 12, color: G4 }}>{c.email}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Salesperson */}
              <div>
                <label style={labelStyle}>
                  Vendedor{" "}
                  <span style={{ color: G4, textTransform: "none", fontWeight: 400, letterSpacing: 0 }}>(opcional)</span>
                </label>
                <select
                  style={{ ...inputStyle, cursor: "pointer" }}
                  value={selectedSpId}
                  onChange={(e) => setSelectedSpId(e.target.value)}
                  onFocus={(e) => { e.target.style.borderColor = C; (e.target as HTMLElement).style.boxShadow = `0 0 0 3px rgba(255,117,31,0.15)`; }}
                  onBlur={(e)  => { e.target.style.borderColor = G2; (e.target as HTMLElement).style.boxShadow = "none"; }}
                >
                  <option value="">Sin vendedor asignado</option>
                  {salespersons.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.defaultCommission}%)</option>)}
                </select>
              </div>
            </div>
          )}

          {/* ─── STEP 2: Productos ─── */}
          {step === "products" && (
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Search */}
              <div>
                <label style={labelStyle}>Agregar producto</label>
                <div style={{ position: "relative" }}>
                  <input
                    autoFocus
                    style={inputStyle}
                    placeholder="Buscar por nombre o código..."
                    value={productQ}
                    onChange={(e) => setProductQ(e.target.value)}
                    onFocus={(e) => { e.target.style.borderColor = C; e.target.style.boxShadow = `0 0 0 3px rgba(255,117,31,0.15)`; }}
                    onBlur={(e)  => { e.target.style.borderColor = G2; e.target.style.boxShadow = "none"; }}
                  />
                  {(productResults.length > 0 || loadingProducts) && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
                      background: "#fff", border: `1px solid ${G2}`, borderRadius: 10,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxHeight: 300, overflowY: "auto",
                    }}>
                      {loadingProducts && <div style={{ padding: "10px 14px", fontSize: 13, color: G4 }}>Buscando...</div>}
                      {productResults.map((p) => (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${G2}` }}>
                          {p.imageUrl && <img src={p.imageUrl} alt={p.name} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 8, border: `1px solid ${G2}`, flexShrink: 0 }} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: G9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: G4 }}>{p.code}</div>
                          </div>
                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            <button
                              onClick={() => addToCart(p, "unit")}
                              style={{ padding: "6px 10px", background: C, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, textAlign: "center", lineHeight: 1.4 }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = CD)}
                              onMouseLeave={(e) => (e.currentTarget.style.background = C)}
                            >
                              + Unidad<br /><span style={{ fontWeight: 400, fontSize: 11 }}>${(p.unitPrice ?? p.price).toLocaleString("es-AR")}</span>
                            </button>
                            {p.bulkPrice != null && p.bulkSize != null && (
                              <button
                                onClick={() => addToCart(p, "bulk")}
                                style={{ padding: "6px 10px", background: "#7C3AED", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, textAlign: "center", lineHeight: 1.4 }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#6D28D9")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "#7C3AED")}
                              >
                                ×{p.bulkSize}<br /><span style={{ fontWeight: 400, fontSize: 11 }}>${p.bulkPrice.toLocaleString("es-AR")}</span>
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
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Carrito</label>
                  {cartCount > 0 && (
                    <span style={{ background: C, color: "#fff", fontSize: 12, fontWeight: 700, borderRadius: 20, padding: "2px 10px" }}>
                      {cartCount} {cartCount === 1 ? "item" : "items"}
                    </span>
                  )}
                </div>
                {cart.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "28px 20px", color: G4, fontSize: 13, background: G05, borderRadius: 10, border: `2px dashed ${G2}` }}>
                    Buscá productos arriba para agregarlos al pedido
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {cart.map((item, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: G05, borderRadius: 10, border: `1px solid ${G2}` }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: G9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.product.name}</div>
                          <div style={{ fontSize: 11, color: G4 }}>
                            {item.mode === "bulk"
                              ? `×${item.product.bulkSize} ${item.product.bulkUnit ?? "pack"} · $${item.unitPrice.toLocaleString("es-AR")}/pack`
                              : `Unidad · $${item.unitPrice.toLocaleString("es-AR")}`}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {([-1, 0, 1] as const).map((d, i) =>
                            d === 0
                              ? <span key="val" style={{ minWidth: 24, textAlign: "center", fontWeight: 700, fontSize: 14 }}>{item.quantity}</span>
                              : <button key={d} onClick={() => updateQty(idx, d)}
                                  style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${G2}`, background: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", color: G7, transition: "border-color .12s, color .12s" }}
                                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = C; e.currentTarget.style.color = C; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = G2; e.currentTarget.style.color = G7; }}
                                >{d === -1 ? "−" : "+"}</button>
                          )}
                        </div>
                        <span style={{ fontWeight: 700, color: C, fontSize: 14, minWidth: 70, textAlign: "right" }}>
                          ${(item.unitPrice * item.quantity).toLocaleString("es-AR")}
                        </span>
                        <button onClick={() => removeFromCart(idx)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: G2, fontSize: 13, padding: 4, transition: "color .12s" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = G2)}
                        >✕</button>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#FFF7F0", border: `2px solid #FED7AA`, borderRadius: 10, marginTop: 2 }}>
                      <span style={{ fontWeight: 700, color: G9 }}>Total</span>
                      <span style={{ fontWeight: 800, fontSize: 18, color: C }}>${cartTotal.toLocaleString("es-AR")}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── STEP 3: Confirmar ─── */}
          {step === "confirm" && (
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Workflow warning */}
              <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#92400E", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <div>
                  <strong>Flujo obligatorio:</strong> Al crear la nota, se imprimirá para que el depósito la prepare físicamente y firme. Solo después de que se registre la confirmación del depósito en el sistema se podrá crear la Orden de Venta.
                </div>
              </div>

              {/* Summary */}
              <div>
                <label style={labelStyle}>Resumen del pedido</label>
                <div style={{ border: `1px solid ${G2}`, borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ padding: "10px 14px", borderBottom: `1px solid ${G2}`, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, color: G5, fontWeight: 600 }}>Cliente:</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: G9 }}>{selectedClient?.name ?? "Sin cuenta (venta presencial)"}</span>
                    {selectedClient?.clientCode && <span style={{ fontSize: 11, background: G1, color: G5, borderRadius: 4, padding: "1px 6px" }}>[{selectedClient.clientCode}]</span>}
                  </div>
                  {selectedSpId && (
                    <div style={{ padding: "10px 14px", borderBottom: `1px solid ${G2}`, display: "flex", gap: 8 }}>
                      <span style={{ fontSize: 13, color: G5, fontWeight: 600 }}>Vendedor:</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: G9 }}>{salespersons.find((s) => s.id === parseInt(selectedSpId))?.name}</span>
                    </div>
                  )}
                  {cart.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px", borderBottom: `1px solid ${G2}`, fontSize: 13 }}>
                      <span style={{ color: G7 }}>{item.product.name} ×{item.quantity}</span>
                      <span style={{ fontWeight: 600, color: G9 }}>${(item.unitPrice * item.quantity).toLocaleString("es-AR")}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: "#FFF7F0", borderTop: `2px solid #FED7AA` }}>
                    <span style={{ fontWeight: 700, color: G9 }}>Total</span>
                    <span style={{ fontWeight: 800, fontSize: 18, color: C }}>${cartTotal.toLocaleString("es-AR")}</span>
                  </div>
                </div>
              </div>

              <div>
                <label style={labelStyle}>
                  Notas{" "}
                  <span style={{ color: G4, textTransform: "none", fontWeight: 400, letterSpacing: 0 }}>(opcional)</span>
                </label>
                <textarea
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", minHeight: 80 }}
                  rows={3}
                  placeholder="Observaciones, instrucciones especiales..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onFocus={(e) => { e.target.style.borderColor = C; e.target.style.boxShadow = `0 0 0 3px rgba(255,117,31,0.15)`; }}
                  onBlur={(e)  => { e.target.style.borderColor = G2; e.target.style.boxShadow = "none"; }}
                />
              </div>

              {submitError && (
                <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, color: "#DC2626", fontSize: 13 }}>
                  {submitError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 24px", background: G05, borderTop: `1px solid ${G2}`,
          borderRadius: "0 0 16px 16px", flexShrink: 0, gap: 10,
        }}>
          <div style={{ display: "flex", gap: 10 }}>
            {step !== "client" && (
              <button
                onClick={() => setStep(step === "confirm" ? "products" : "client")}
                disabled={submitting}
                style={{ padding: "10px 20px", border: `2px solid ${G2}`, borderRadius: 10, background: "#fff", color: G5, fontWeight: 600, cursor: "pointer", fontSize: 14, transition: "background .12s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = G1)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
              >← Atrás</button>
            )}
            <button
              onClick={onClose}
              style={{ padding: "10px 20px", border: `2px solid ${G2}`, borderRadius: 10, background: "#fff", color: G5, fontWeight: 600, cursor: "pointer", fontSize: 14, transition: "background .12s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = G1)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
            >Cancelar</button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {cart.length > 0 && step === "products" && (
              <span style={{ fontSize: 14, color: G5 }}>
                Total: <strong style={{ color: C }}>${cartTotal.toLocaleString("es-AR")}</strong>
              </span>
            )}
            {step === "client" && (
              <button onClick={() => setStep("products")}
                style={{ padding: "10px 24px", background: C, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 14, transition: "background .12s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = CD)}
                onMouseLeave={(e) => (e.currentTarget.style.background = C)}
              >Agregar productos →</button>
            )}
            {step === "products" && (
              <button onClick={() => setStep("confirm")} disabled={cart.length === 0}
                style={{ padding: "10px 24px", background: cart.length ? C : G2, color: cart.length ? "#fff" : G4, border: "none", borderRadius: 10, fontWeight: 700, cursor: cart.length ? "pointer" : "not-allowed", fontSize: 14, transition: "background .12s" }}
                onMouseEnter={(e) => { if (cart.length) e.currentTarget.style.background = CD; }}
                onMouseLeave={(e) => { if (cart.length) e.currentTarget.style.background = C; }}
              >Revisar pedido →</button>
            )}
            {step === "confirm" && (
              <button onClick={submit} disabled={submitting || !cart.length}
                style={{ padding: "10px 24px", background: submitting || !cart.length ? G2 : C, color: submitting || !cart.length ? G4 : "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: submitting || !cart.length ? "not-allowed" : "pointer", fontSize: 14, transition: "background .12s" }}
                onMouseEnter={(e) => { if (!submitting && cart.length) e.currentTarget.style.background = CD; }}
                onMouseLeave={(e) => { if (!submitting && cart.length) e.currentTarget.style.background = C; }}
              >{submitting ? "Creando…" : "📋 Crear Nota de Pedido"}</button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
