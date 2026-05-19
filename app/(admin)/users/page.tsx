"use client";

import { useEffect, useState, useCallback } from "react";

type PriceList      = { id: number; name: string; discountPercentage: number | null };
type SalespersonOpt = { id: number; name: string };
type UserRow = {
  id: number;
  name: string;
  email: string | null;
  clientCode: string | null;
  company: string | null;
  phone: string | null;
  role: string;
  status: string;
  createdAt: string;
  lastLogin: string | null;
  priceList: { id: number; name: string; discountPercentage: number | null } | null;
  salesperson: { id: number; name: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente", approved: "Aprobado", rejected: "Rechazado", inactive: "Inactivo",
};

function StatusBadge({ status }: { status: string }) {
  return <span className={`user-status-badge user-status-badge--${status}`}>{STATUS_LABELS[status] ?? status}</span>;
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "60px 0" }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        border: "4px solid #FED7AA", borderTopColor: "#FF751F",
        animation: "spin 0.75s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const LIMIT = 50;

export default function AdminUsersPage() {
  const [users, setUsers]               = useState<UserRow[]>([]);
  const [priceLists, setPriceLists]     = useState<PriceList[]>([]);
  const [salespersons, setSalespersons] = useState<SalespersonOpt[]>([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [saving, setSaving]             = useState<number | null>(null);
  const [q, setQ]                       = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page), limit: String(LIMIT),
        ...(q            ? { search: q }            : {}),
        ...(filterStatus ? { status: filterStatus } : {}),
      });

      const [uRes, pRes, sRes] = await Promise.all([
        fetch(`/api/admin/users?${params}`),
        fetch("/api/admin/price-lists"),
        fetch("/api/admin/salespersons?status=active"),
      ]);

      if (!uRes.ok) throw new Error(`Error ${uRes.status} al cargar usuarios`);

      const uData = await uRes.json();
      const pData = pRes.ok ? await pRes.json() : { priceLists: [] };
      const sData = sRes.ok ? await sRes.json() : { salespersons: [] };

      setUsers(uData.users ?? []);
      setTotal(uData.total ?? 0);
      setPriceLists(pData.priceLists ?? []);
      setSalespersons(sData.salespersons ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  }, [page, q, filterStatus]);

  useEffect(() => { load(); }, [load]);
  // Reset page when filters change
  useEffect(() => { setPage(1); }, [q, filterStatus]);

  async function patchUser(
    id: number,
    patch: { status?: string; priceListId?: number | null; salespersonId?: number | null }
  ) {
    setSaving(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const { user } = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...user } : u)));
      }
    } finally {
      setSaving(null);
    }
  }

  const pendingCount = users.filter((u) => u.status === "pending").length;
  const totalPages   = Math.ceil(total / LIMIT);

  return (
    <div className="au-page">
      {/* Header */}
      <div className="au-header">
        <div>
          <h1 className="au-title">
            Usuarios
            {pendingCount > 0 && (
              <span className="au-pending-badge">{pendingCount} pendiente{pendingCount > 1 ? "s" : ""}</span>
            )}
          </h1>
          <p className="au-sub">
            {total > 0 ? `${total.toLocaleString("es-AR")} usuarios en total` : "Aprobá registros y asigná listas de precios"}
          </p>
        </div>
        <button className="au-refresh-btn" onClick={load} title="Recargar">🔄</button>
      </div>

      {/* Filters */}
      <div className="au-filters">
        <input
          className="au-search"
          placeholder="Buscar nombre, email, código o empresa…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="au-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobado</option>
          <option value="rejected">Rechazado</option>
          <option value="inactive">Inactivo</option>
        </select>
      </div>

      {/* Error state */}
      {error && !loading && (
        <div style={{ margin: "16px 0", padding: "16px 20px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "#DC2626", fontSize: 14 }}>Error al cargar usuarios</div>
            <div style={{ color: "#EF4444", fontSize: 13, marginTop: 2 }}>{error}</div>
          </div>
          <button
            onClick={load}
            style={{ padding: "8px 16px", background: "#DC2626", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Loading */}
      {loading ? <Spinner /> : (
        <>
          <div className="au-table-wrap">
            <table className="au-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Empresa</th>
                  <th>Estado</th>
                  <th>Lista de precios</th>
                  <th>Vendedor</th>
                  <th>Registro</th>
                  <th className="au-th-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr><td colSpan={7} className="au-empty">No se encontraron usuarios</td></tr>
                )}
                {users.map((user) => (
                  <tr key={user.id} className={`au-row${user.status === "pending" ? " au-row--pending" : ""}`}>
                    <td>
                      <div className="au-cell-user">
                        <div className="au-avatar">{(user.name ?? "?").charAt(0).toUpperCase()}</div>
                        <div>
                          <div className="au-user-name">{user.name}</div>
                          <div className="au-user-email">{user.email ?? user.clientCode ?? "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="au-cell-company">{user.company ?? <span className="au-no-data">—</span>}</td>
                    <td><StatusBadge status={user.status} /></td>
                    <td>
                      <select
                        className="au-pl-select"
                        value={user.priceList?.id ?? ""}
                        disabled={saving === user.id || user.role !== "customer"}
                        onChange={(e) => {
                          const val = e.target.value;
                          patchUser(user.id, { priceListId: val ? parseInt(val) : null });
                        }}
                      >
                        <option value="">Sin lista</option>
                        {priceLists.map((pl) => (
                          <option key={pl.id} value={pl.id}>
                            {pl.name}{pl.discountPercentage ? ` (${pl.discountPercentage}%)` : ""}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="au-pl-select"
                        value={user.salesperson?.id ?? ""}
                        disabled={saving === user.id || user.role !== "customer"}
                        onChange={(e) => {
                          const val = e.target.value;
                          patchUser(user.id, { salespersonId: val ? parseInt(val) : null });
                        }}
                      >
                        <option value="">Sin vendedor</option>
                        {salespersons.map((sp) => (
                          <option key={sp.id} value={sp.id}>{sp.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="au-cell-date">
                      {new Date(user.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                    </td>
                    <td className="au-cell-actions">
                      {user.role !== "customer" ? (
                        <span className="au-role-admin">{user.role}</span>
                      ) : (
                        <div className="au-action-btns">
                          {user.status !== "approved" && (
                            <button className="au-btn au-btn--approve" disabled={saving === user.id} onClick={() => patchUser(user.id, { status: "approved" })}>
                              {saving === user.id ? "…" : "✓ Aprobar"}
                            </button>
                          )}
                          {user.status !== "rejected" && (
                            <button className="au-btn au-btn--reject" disabled={saving === user.id} onClick={() => patchUser(user.id, { status: "rejected" })}>
                              {saving === user.id ? "…" : "✕ Rechazar"}
                            </button>
                          )}
                          {user.status === "rejected" && (
                            <button className="au-btn au-btn--pending" disabled={saving === user.id} onClick={() => patchUser(user.id, { status: "pending" })}>
                              {saving === user.id ? "…" : "↩ Pendiente"}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination" style={{ marginTop: 16 }}>
              <button className="page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>←</button>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                const n = totalPages <= 10 ? i + 1
                  : page <= 5 ? i + 1
                  : page >= totalPages - 4 ? totalPages - 9 + i
                  : page - 4 + i;
                return (
                  <button key={n} className={`page-btn${page === n ? " active" : ""}`} onClick={() => setPage(n)}>{n}</button>
                );
              })}
              <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>→</button>
              <span style={{ fontSize: 13, color: "#9CA3AF", marginLeft: 8 }}>{total.toLocaleString("es-AR")} total</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
