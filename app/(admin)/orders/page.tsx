"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type Order = {
  id: number;
  guestName: string | null;
  guestEmail: string | null;
  total: number;
  status: string;
  createdAt: string;
  user: { name: string; email: string } | null;
  items: { quantity: number }[];
};

const STATUSES = [
  { value: "", label: "Todos los estados" },
  { value: "pendiente", label: "Pendiente" },
  { value: "procesando", label: "Procesando" },
  { value: "enviado", label: "Enviado" },
  { value: "entregado", label: "Entregado" },
  { value: "cancelado", label: "Cancelado" },
];

const STATUS_NEXT: Record<string, string> = {
  pendiente: "procesando",
  procesando: "enviado",
  enviado: "entregado",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const LIMIT = 20;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ search, status: statusFilter, page: String(page), limit: String(LIMIT) });
    const res = await fetch(`/api/admin/orders?${params}`);
    const data = await res.json();
    setOrders(data.orders);
    setTotal(data.total);
    setLoading(false);
  }, [search, statusFilter, page]);

  useEffect(() => {
    const t = setTimeout(fetchOrders, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchOrders]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  async function changeStatus(orderId: number, status: string) {
    setUpdating(orderId);
    await fetch(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchOrders();
    setUpdating(null);
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Órdenes</h1>
        <span className="admin-total-badge">{total} total</span>
      </div>

      {/* Filters */}
      <div className="admin-filters">
        <div className="admin-search-wrap">
          <span className="admin-search-icon">🔍</span>
          <input
            className="admin-search"
            placeholder="Buscar por cliente o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="admin-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div className="admin-loading">Cargando órdenes...</div>
        ) : orders.length === 0 ? (
          <div className="admin-empty" style={{ padding: 48 }}>No hay órdenes{statusFilter ? ` con estado "${statusFilter}"` : ""}.</div>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Email</th>
                <th>Items</th>
                <th>Total</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const name = o.guestName ?? o.user?.name ?? "—";
                const email = o.guestEmail ?? o.user?.email ?? "—";
                const itemCount = o.items.reduce((s, i) => s + i.quantity, 0);
                const nextStatus = STATUS_NEXT[o.status];
                return (
                  <tr key={o.id} className={updating === o.id ? "row-updating" : ""}>
                    <td><Link href={`/orders/${o.id}`} className="order-id-link">#{o.id}</Link></td>
                    <td className="td-name">{name}</td>
                    <td className="td-muted">{email}</td>
                    <td className="td-center">{itemCount}</td>
                    <td className="td-price">${o.total.toLocaleString("es-AR")}</td>
                    <td className="td-muted">{new Date(o.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                    <td>
                      <select
                        className={`status-select status-select--${o.status}`}
                        value={o.status}
                        onChange={(e) => changeStatus(o.id, e.target.value)}
                        disabled={updating === o.id}
                      >
                        {STATUSES.filter((s) => s.value).map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="td-actions">
                        {nextStatus && (
                          <button
                            className="btn-advance"
                            onClick={() => changeStatus(o.id, nextStatus)}
                            disabled={updating === o.id}
                            title={`Avanzar a "${nextStatus}"`}
                          >
                            {updating === o.id ? "..." : "→"}
                          </button>
                        )}
                        <Link href={`/orders/${o.id}`} className="btn-view">Ver</Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination" style={{ marginTop: 16 }}>
          <button className="page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>←</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button key={n} className={`page-btn${page === n ? " active" : ""}`} onClick={() => setPage(n)}>{n}</button>
          ))}
          <button className="page-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>→</button>
        </div>
      )}
    </div>
  );
}
