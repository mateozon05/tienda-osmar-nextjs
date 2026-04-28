"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type OrderItem = {
  id: number;
  quantity: number;
  unitPrice: number;
  product: { name: string; code: string };
};

type Order = {
  id: number;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  shippingAddress: string;
  shippingCity: string;
  shippingMethod: string;
  notes: string | null;
  total: number;
  status: string;
  mpPaymentId: string | null;
  mpStatus: string | null;
  createdAt: string;
  updatedAt: string;
  user: { name: string; email: string } | null;
  items: OrderItem[];
};

const STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  procesando: "Procesando",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const STATUSES = ["pendiente", "procesando", "enviado", "entregado", "cancelado"];

const STATUS_NEXT: Record<string, string> = {
  pendiente: "procesando",
  procesando: "enviado",
  enviado: "entregado",
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/orders/${id}`);
    if (!res.ok) { setError("Orden no encontrada"); setLoading(false); return; }
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

  const name = order.guestName ?? order.user?.name ?? "—";
  const email = order.guestEmail ?? order.user?.email ?? "—";
  const phone = order.guestPhone ?? "—";
  const nextStatus = STATUS_NEXT[order.status];
  const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/orders" className="btn-back-admin">←</Link>
          <h1 className="admin-page-title">Orden #{order.id}</h1>
          <span className={`status-badge status-badge--${order.status}`}>
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {nextStatus && (
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

          {/* Items */}
          <div className="admin-card">
            <h3 className="admin-card-title">Productos ({itemCount} {itemCount === 1 ? "item" : "items"})</h3>
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
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{item.product.name}</div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Cód: {item.product.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="td-center">{item.quantity}</td>
                    <td className="td-right td-price">${item.unitPrice.toLocaleString("es-AR")}</td>
                    <td className="td-right td-price">${(item.unitPrice * item.quantity).toLocaleString("es-AR")}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ textAlign: "right", fontWeight: 700, fontSize: 15, paddingTop: 12 }}>Total</td>
                  <td className="td-right" style={{ fontWeight: 800, fontSize: 18, color: "var(--c1)", paddingTop: 12 }}>
                    ${order.total.toLocaleString("es-AR")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment info */}
          {order.mpPaymentId && (
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
                    href={`https://www.mercadopago.com.ar/activities`}
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
              <div className="detail-info-item">
                <span className="detail-info-label">Email</span>
                <span className="detail-info-value">{email}</span>
              </div>
              <div className="detail-info-item">
                <span className="detail-info-label">Teléfono</span>
                <span className="detail-info-value">{phone}</span>
              </div>
              <div className="detail-info-item">
                <span className="detail-info-label">Dirección</span>
                <span className="detail-info-value">{order.shippingAddress}, {order.shippingCity}</span>
              </div>
              <div className="detail-info-item">
                <span className="detail-info-label">Envío</span>
                <span className="detail-info-value">{order.shippingMethod === "retiro" ? "Retiro en local" : "Envío a domicilio"}</span>
              </div>
              {order.notes && (
                <div className="detail-info-item">
                  <span className="detail-info-label">Notas</span>
                  <span className="detail-info-value">{order.notes}</span>
                </div>
              )}
              <div className="detail-info-item">
                <span className="detail-info-label">Tipo</span>
                <span className="detail-info-value">{order.user ? "Usuario registrado" : "Invitado"}</span>
              </div>
            </div>
          </div>

          {/* Status management */}
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

          {/* Dates */}
          <div className="admin-card">
            <h3 className="admin-card-title">Fechas</h3>
            <div className="detail-info-grid">
              <div className="detail-info-item">
                <span className="detail-info-label">Creada</span>
                <span className="detail-info-value">
                  {new Date(order.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
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
