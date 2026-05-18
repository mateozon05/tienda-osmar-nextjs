"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type OrderItem = {
  id: number;
  quantity: number;
  unitPrice: number;
  product: { name: string; code: string; imageUrl: string | null; price: number } | null;
};

type Order = {
  id: number;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingMethod: string;
  paymentMethod: string;
  notes: string | null;
  total: number;
  subtotal: number;
  tax: number;
  totalWithTax: number;
  status: string;
  mpPaymentId: string | null;
  mpStatus: string | null;
  createdAt: string;
  updatedAt: string;
  orderDate: string;
  importedFromSipe: boolean;
  orderType: string;
  sipeNumber: string | null;
  clientCode: string | null;
  clientName: string | null;
  salespersonName: string | null;
  invoiceNumber: string | null;
  invoiceType: string | null;
  invoiceDate: string | null;
  channel: string | null;
  branch: string | null;
  commissionRate: number | null;
  commissionAmount: number | null;
  user: { name: string; email: string; clientCode: string | null } | null;
  salesperson: { id: number; name: string } | null;
  items: OrderItem[];
};

const STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  procesando: "Procesando",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  invoiced: "Facturada",
  delivered: "Entregada",
};

const STATUSES = ["pendiente", "procesando", "enviado", "entregado", "cancelado"];

const STATUS_NEXT: Record<string, string> = {
  pendiente: "procesando",
  procesando: "enviado",
  enviado: "entregado",
};

function fmt(n: number | null | undefined) {
  return "$" + (n ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/orders/${id}`);
    if (!res.ok) {
      setError("Orden no encontrada");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setOrder(data.order);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  async function changeStatus(status: string) {
    if (!order) return;
    setUpdating(true);
    await fetch(`/api/admin/orders/${order.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchOrder();
    setUpdating(false);
  }

  if (loading) return <div className="admin-page"><div className="admin-loading">Cargando orden...</div></div>;
  if (error || !order) return (
    <div className="admin-page">
      <div className="admin-empty" style={{ padding: 48 }}>{error || "Orden no encontrada"}</div>
      <Link href="/orders" className="btn-back-admin">← Volver a órdenes</Link>
    </div>
  );

  const isSipe = order.importedFromSipe;
  const name = order.guestName ?? order.user?.name ?? order.clientName ?? "—";
  const email = order.guestEmail ?? order.user?.email ?? "—";
  const phone = order.guestPhone ?? "—";
  const nextStatus = STATUS_NEXT[order.status];
  const itemCount = order.items?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const salesperson = order.salesperson?.name ?? order.salespersonName ?? null;
  const clientCode = order.clientCode ?? order.user?.clientCode ?? null;

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/orders" className="btn-back-admin">←</Link>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 className="admin-page-title" style={{ margin: 0 }}>
                {isSipe ? `SIPE ${order.sipeNumber ?? `#${order.id}`}` : `Orden #${order.id}`}
              </h1>
              <span className={`status-badge status-badge--${order.status}`}>
                {STATUS_LABEL[order.status] ?? order.status}
              </span>
              {isSipe && (
                <span style={{ fontSize: "0.75rem", background: "#EDE9FE", color: "#5B21B6", borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>
                  SIPE
                </span>
              )}
              {order.orderType === "invoiced" && (
                <span style={{ fontSize: "0.75rem", background: "#DCFCE7", color: "#166534", borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>
                  Facturada
                </span>
              )}
            </div>
            {isSipe && order.orderDate && (
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
                Fecha: {new Date(order.orderDate).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!isSipe && nextStatus && (
            <button
              className="btn-advance-lg"
              onClick={() => changeStatus(nextStatus)}
              disabled={updating}
            >
              {updating ? "Actualizando..." : `→ Avanzar a ${STATUS_LABEL[nextStatus]}`}
            </button>
          )}
        </div>
      </div>

      <div className="order-detail-grid">
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Products */}
          <div className="admin-card">
            <h3 className="admin-card-title">
              {isSipe
                ? "Detalle de productos"
                : `Productos (${itemCount} ${itemCount === 1 ? "item" : "items"})`}
            </h3>
            {!order.items || order.items.length === 0 ? (
              <div style={{ padding: "20px 0", color: "var(--text-muted)", fontSize: "0.9rem", textAlign: "center" }}>
                {isSipe
                  ? "Las órdenes SIPE no incluyen detalle de productos individuales."
                  : "Esta orden no tiene productos."}
              </div>
            ) : (
              <div className="detail-table-wrap">
                <table className="detail-items-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th className="td-center">Cant.</th>
                      <th className="td-right">Precio unit.</th>
                      <th className="td-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {item.product?.imageUrl && (
                              <img
                                src={item.product.imageUrl}
                                alt={item.product?.name ?? ""}
                                style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, border: "1px solid #E5E7EB" }}
                              />
                            )}
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>
                                {item.product?.name ?? "Producto eliminado"}
                              </div>
                              {item.product?.code && (
                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                  Cód: {item.product.code}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="td-center">{item.quantity ?? 0}</td>
                        <td className="td-right td-price">${(item.unitPrice ?? 0).toLocaleString("es-AR")}</td>
                        <td className="td-right td-price">${((item.unitPrice ?? 0) * (item.quantity ?? 0)).toLocaleString("es-AR")}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {order.subtotal > 0 && order.subtotal !== order.total && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: "right", fontSize: 13, paddingTop: 10, color: "var(--text-muted)" }}>Subtotal</td>
                        <td className="td-right" style={{ fontSize: 13, paddingTop: 10, color: "var(--text-muted)" }}>{fmt(order.subtotal)}</td>
                      </tr>
                    )}
                    {order.tax > 0 && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: "right", fontSize: 13, color: "var(--text-muted)" }}>IVA</td>
                        <td className="td-right" style={{ fontSize: 13, color: "var(--text-muted)" }}>{fmt(order.tax)}</td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan={3} style={{ textAlign: "right", fontWeight: 700, fontSize: 15, paddingTop: 10 }}>Total</td>
                      <td className="td-right" style={{ fontWeight: 800, fontSize: 18, color: "var(--c1)", paddingTop: 10 }}>
                        ${(order.total ?? 0).toLocaleString("es-AR")}
                      </td>
                    </tr>
                    {order.totalWithTax > 0 && order.totalWithTax !== order.total && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: "right", fontSize: 13, color: "var(--text-muted)" }}>Total c/IVA</td>
                        <td className="td-right" style={{ fontSize: 13, color: "var(--text-muted)" }}>{fmt(order.totalWithTax)}</td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* SIPE — Invoice info */}
          {isSipe && (order.invoiceNumber || order.channel || order.branch) && (
            <div className="admin-card">
              <h3 className="admin-card-title">Facturación</h3>
              <div className="detail-info-grid">
                {order.invoiceNumber && (
                  <div className="detail-info-item">
                    <span className="detail-info-label">N° Factura</span>
                    <span className="detail-info-value"><code style={{ fontSize: "0.85rem" }}>{order.invoiceNumber}</code></span>
                  </div>
                )}
                {order.invoiceType && (
                  <div className="detail-info-item">
                    <span className="detail-info-label">Tipo</span>
                    <span className="detail-info-value">FC {order.invoiceType}</span>
                  </div>
                )}
                {order.invoiceDate && (
                  <div className="detail-info-item">
                    <span className="detail-info-label">Fecha factura</span>
                    <span className="detail-info-value">
                      {new Date(order.invoiceDate).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </span>
                  </div>
                )}
                {order.channel && (
                  <div className="detail-info-item">
                    <span className="detail-info-label">Canal</span>
                    <span className="detail-info-value">{order.channel}</span>
                  </div>
                )}
                {order.branch && (
                  <div className="detail-info-item">
                    <span className="detail-info-label">Sucursal</span>
                    <span className="detail-info-value">{order.branch}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment info — web orders */}
          {!isSipe && order.mpPaymentId && (
            <div className="admin-card">
              <h3 className="admin-card-title">Pago — Mercado Pago</h3>
              <div className="detail-info-grid">
                <div className="detail-info-item">
                  <span className="detail-info-label">ID de pago</span>
                  <span className="detail-info-value"><code>{order.mpPaymentId}</code></span>
                </div>
                {order.mpStatus && (
                  <div className="detail-info-item">
                    <span className="detail-info-label">Estado MP</span>
                    <span className="detail-info-value">{order.mpStatus}</span>
                  </div>
                )}
                <div className="detail-info-item">
                  <a
                    href="https://www.mercadopago.com.ar/activities"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="admin-link"
                  >
                    Ver en Mercado Pago →
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Customer */}
          <div className="admin-card">
            <h3 className="admin-card-title">Cliente</h3>
            <div className="detail-info-grid">
              <div className="detail-info-item">
                <span className="detail-info-label">Nombre</span>
                <span className="detail-info-value">{name}</span>
              </div>
              {clientCode && (
                <div className="detail-info-item">
                  <span className="detail-info-label">Código cliente</span>
                  <span className="detail-info-value"><code style={{ fontSize: "0.85rem" }}>{clientCode}</code></span>
                </div>
              )}
              {email !== "—" && (
                <div className="detail-info-item">
                  <span className="detail-info-label">Email</span>
                  <span className="detail-info-value">{email}</span>
                </div>
              )}
              {!isSipe && phone !== "—" && (
                <div className="detail-info-item">
                  <span className="detail-info-label">Teléfono</span>
                  <span className="detail-info-value">{phone}</span>
                </div>
              )}
              {!isSipe && (order.shippingAddress || order.shippingCity) && (
                <div className="detail-info-item">
                  <span className="detail-info-label">Dirección</span>
                  <span className="detail-info-value">
                    {[order.shippingAddress, order.shippingCity].filter(Boolean).join(", ") || "—"}
                  </span>
                </div>
              )}
              {!isSipe && (
                <div className="detail-info-item">
                  <span className="detail-info-label">Envío</span>
                  <span className="detail-info-value">
                    {order.shippingMethod === "retiro" ? "Retiro en local" : "Envío a domicilio"}
                  </span>
                </div>
              )}
              {!isSipe && order.notes && (
                <div className="detail-info-item">
                  <span className="detail-info-label">Notas</span>
                  <span className="detail-info-value">{order.notes}</span>
                </div>
              )}
              <div className="detail-info-item">
                <span className="detail-info-label">Tipo</span>
                <span className="detail-info-value">
                  {isSipe ? "Historial SIPE" : (order.user ? "Usuario registrado" : "Invitado")}
                </span>
              </div>
            </div>
          </div>

          {/* Salesperson */}
          {salesperson && (
            <div className="admin-card">
              <h3 className="admin-card-title">Vendedor</h3>
              <div className="detail-info-grid">
                <div className="detail-info-item">
                  <span className="detail-info-label">Nombre</span>
                  <span className="detail-info-value">
                    {order.salesperson ? (
                      <Link href={`/salespersons/${order.salesperson.id}`} className="admin-link">
                        {order.salesperson.name}
                      </Link>
                    ) : salesperson}
                  </span>
                </div>
                {order.commissionRate != null && (
                  <div className="detail-info-item">
                    <span className="detail-info-label">Comisión</span>
                    <span className="detail-info-value">
                      {order.commissionRate}%
                      {order.commissionAmount != null && (
                        <span style={{ color: "var(--text-muted)", marginLeft: 6, fontSize: "0.85rem" }}>
                          (${(order.commissionAmount ?? 0).toLocaleString("es-AR")})
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status management — web orders only */}
          {!isSipe && (
            <div className="admin-card">
              <h3 className="admin-card-title">Estado</h3>
              <div style={{ marginBottom: 12 }}>
                <label className="detail-info-label" style={{ display: "block", marginBottom: 6 }}>
                  Cambiar estado
                </label>
                <select
                  className={`status-select status-select--${order.status}`}
                  value={order.status}
                  onChange={(e) => changeStatus(e.target.value)}
                  disabled={updating}
                  style={{ width: "100%", padding: "10px 12px", fontSize: 14 }}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>
              <div className="status-timeline">
                {["pendiente", "procesando", "enviado", "entregado"].map((s, i) => {
                  const statuses = ["pendiente", "procesando", "enviado", "entregado", "cancelado"];
                  const currentIdx = statuses.indexOf(order.status);
                  const stepIdx = statuses.indexOf(s);
                  const isDone = order.status === "cancelado" ? false : currentIdx > stepIdx;
                  const isCurrent = order.status === s;
                  return (
                    <div key={s} className={`timeline-step${isDone ? " done" : ""}${isCurrent ? " current" : ""}`}>
                      <div className="timeline-dot" />
                      {i < 3 && <div className="timeline-line" />}
                      <span className="timeline-label">{STATUS_LABEL[s]}</span>
                    </div>
                  );
                })}
                {order.status === "cancelado" && (
                  <div className="timeline-step current" style={{ marginTop: 8 }}>
                    <div className="timeline-dot" style={{ background: "#ef4444" }} />
                    <span className="timeline-label" style={{ color: "#ef4444" }}>Cancelado</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="admin-card">
            <h3 className="admin-card-title">Fechas</h3>
            <div className="detail-info-grid">
              {isSipe && order.orderDate && (
                <div className="detail-info-item">
                  <span className="detail-info-label">Fecha orden</span>
                  <span className="detail-info-value">
                    {new Date(order.orderDate).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </span>
                </div>
              )}
              {!isSipe && (
                <div className="detail-info-item">
                  <span className="detail-info-label">Creada</span>
                  <span className="detail-info-value">
                    {new Date(order.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}
              <div className="detail-info-item">
                <span className="detail-info-label">Actualizada</span>
                <span className="detail-info-value">
                  {new Date(order.updatedAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
