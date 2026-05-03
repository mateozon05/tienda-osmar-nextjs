"use client";

import { useEffect, useState, useCallback } from "react";

type PriceList = { id: number; name: string; discountPercentage: number | null; isDefault: boolean };
type UserRow = {
  id: number;
  name: string;
  email: string;
  company: string | null;
  role: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  priceList: { id: number; name: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending:  "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`user-status-badge user-status-badge--${status}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers]           = useState<UserRow[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState<number | null>(null);
  const [q, setQ]                   = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [uRes, pRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/price-lists"),
    ]);
    const uData = await uRes.json();
    const pData = await pRes.json();
    setUsers(uData.users ?? []);
    setPriceLists(pData.priceLists ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function patchUser(id: number, patch: { status?: string; priceListId?: number | null }) {
    setSaving(id);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const { user } = await res.json();
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...user } : u));
    }
    setSaving(null);
  }

  const filtered = users.filter(u => {
    const matchQ = !q || u.name.toLowerCase().includes(q.toLowerCase()) ||
      u.email.toLowerCase().includes(q.toLowerCase()) ||
      (u.company ?? "").toLowerCase().includes(q.toLowerCase());
    const matchStatus = !filterStatus || u.status === filterStatus;
    return matchQ && matchStatus;
  });

  const pendingCount = users.filter(u => u.status === "pending").length;

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
          <p className="au-sub">Aprobá registros y asigná listas de precios</p>
        </div>
        <button className="au-refresh-btn" onClick={load} title="Recargar">
          🔄
        </button>
      </div>

      {/* Filters */}
      <div className="au-filters">
        <input
          className="au-search"
          placeholder="Buscar nombre, email o empresa…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <select
          className="au-select"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobado</option>
          <option value="rejected">Rechazado</option>
        </select>
      </div>

      {loading ? (
        <div className="au-loading">Cargando usuarios…</div>
      ) : (
        <div className="au-table-wrap">
          <table className="au-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Empresa</th>
                <th>Estado</th>
                <th>Lista de precios</th>
                <th>Registro</th>
                <th className="au-th-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="au-empty">No se encontraron usuarios</td>
                </tr>
              )}
              {filtered.map(user => (
                <tr key={user.id} className={`au-row${user.status === "pending" ? " au-row--pending" : ""}`}>
                  {/* User info */}
                  <td>
                    <div className="au-cell-user">
                      <div className="au-avatar">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="au-user-name">{user.name}</div>
                        <div className="au-user-email">{user.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Company */}
                  <td className="au-cell-company">
                    {user.company ?? <span className="au-no-data">—</span>}
                  </td>

                  {/* Status */}
                  <td>
                    <StatusBadge status={user.status} />
                  </td>

                  {/* Price list selector */}
                  <td>
                    <select
                      className="au-pl-select"
                      value={user.priceList?.id ?? ""}
                      disabled={saving === user.id || user.role === "admin"}
                      onChange={e => {
                        const val = e.target.value;
                        patchUser(user.id, { priceListId: val ? parseInt(val) : null });
                      }}
                    >
                      <option value="">Sin lista</option>
                      {priceLists.map(pl => (
                        <option key={pl.id} value={pl.id}>
                          {pl.name}{pl.discountPercentage ? ` (${pl.discountPercentage}%)` : ""}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Date */}
                  <td className="au-cell-date">
                    {new Date(user.createdAt).toLocaleDateString("es-AR", {
                      day: "2-digit", month: "2-digit", year: "2-digit",
                    })}
                  </td>

                  {/* Actions */}
                  <td className="au-cell-actions">
                    {user.role === "admin" ? (
                      <span className="au-role-admin">Admin</span>
                    ) : (
                      <div className="au-action-btns">
                        {user.status !== "approved" && (
                          <button
                            className="au-btn au-btn--approve"
                            disabled={saving === user.id}
                            onClick={() => patchUser(user.id, { status: "approved" })}
                          >
                            {saving === user.id ? "…" : "✓ Aprobar"}
                          </button>
                        )}
                        {user.status !== "rejected" && (
                          <button
                            className="au-btn au-btn--reject"
                            disabled={saving === user.id}
                            onClick={() => patchUser(user.id, { status: "rejected" })}
                          >
                            {saving === user.id ? "…" : "✕ Rechazar"}
                          </button>
                        )}
                        {user.status === "rejected" && (
                          <button
                            className="au-btn au-btn--pending"
                            disabled={saving === user.id}
                            onClick={() => patchUser(user.id, { status: "pending" })}
                          >
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
      )}
    </div>
  );
}
