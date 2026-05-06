"use client";

import { useEffect, useState, useCallback } from "react";

type AuditLog = {
  id: number;
  action: string;
  entity: string;
  entityId: number | null;
  userId: number | null;
  userName: string | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

const ACTION_META: Record<string, { label: string; icon: string; color: string }> = {
  LOGIN:                   { label: "Inicio de sesión",          icon: "🔐", color: "#D1FAE5" },
  LOGOUT:                  { label: "Cierre de sesión",          icon: "🚪", color: "#F3F4F6" },
  REGISTER:                { label: "Registro",                  icon: "📝", color: "#EEF2FF" },
  USER_APPROVED:           { label: "Usuario aprobado",          icon: "✅", color: "#D1FAE5" },
  USER_REJECTED:           { label: "Usuario rechazado",         icon: "❌", color: "#FEE2E2" },
  USER_PRICE_LIST_CHANGED: { label: "Lista de precios cambiada", icon: "💰", color: "#FEF3C7" },
  ORDER_CREATED:           { label: "Pedido creado",             icon: "🛒", color: "#DBEAFE" },
  ORDER_STATUS_CHANGED:    { label: "Estado de pedido",          icon: "📦", color: "#EDE9FE" },
  PRICE_LIST_CREATED:      { label: "Lista creada",              icon: "🏷️", color: "#FEF3C7" },
  PRICE_LIST_UPDATED:      { label: "Lista actualizada",         icon: "🏷️", color: "#FEF9C3" },
};

const FILTERS = [
  { value: "",                      label: "Todos" },
  { value: "LOGIN",                 label: "Logins" },
  { value: "REGISTER",              label: "Registros" },
  { value: "USER_APPROVED",         label: "Aprobaciones" },
  { value: "USER_REJECTED",         label: "Rechazos" },
  { value: "ORDER_CREATED",         label: "Pedidos" },
  { value: "USER_PRICE_LIST_CHANGED", label: "Listas" },
];

function formatDetails(details: Record<string, unknown> | null): string {
  if (!details || Object.keys(details).length === 0) return "—";
  return Object.entries(details)
    .map(([k, v]) => `${k}: ${v ?? "—"}`)
    .join(" · ");
}

export default function AuditPage() {
  const [logs,    setLogs]    = useState<AuditLog[]>([]);
  const [filter,  setFilter]  = useState("");
  const [q,       setQ]       = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const url = filter ? `/api/admin/audit?action=${filter}` : "/api/admin/audit";
    const res  = await fetch(url);
    const data = await res.json();
    setLogs(data.logs ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const visible = q
    ? logs.filter(l =>
        (l.userName ?? "").toLowerCase().includes(q.toLowerCase()) ||
        (l.ip ?? "").includes(q) ||
        (l.action ?? "").toLowerCase().includes(q.toLowerCase())
      )
    : logs;

  return (
    <div className="audit-page">
      <div className="audit-header">
        <div>
          <h1 className="audit-title">🛡️ Auditoría del sistema</h1>
          <p className="audit-sub">Registro de todas las acciones importantes</p>
        </div>
        <button className="au-refresh-btn" onClick={load} title="Recargar">🔄</button>
      </div>

      {/* Filters */}
      <div className="audit-toolbar">
        <div className="audit-filters">
          {FILTERS.map(f => (
            <button
              key={f.value}
              className={`audit-filter-btn${filter === f.value ? " audit-filter-btn--active" : ""}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          className="au-search"
          placeholder="Buscar usuario, IP, acción…"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ maxWidth: 240 }}
        />
      </div>

      {loading ? (
        <div className="au-loading">Cargando registros…</div>
      ) : (
        <div className="audit-table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Acción</th>
                <th>Usuario</th>
                <th>Detalles</th>
                <th>IP</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="au-empty">No hay registros de auditoría</td>
                </tr>
              )}
              {visible.map(log => {
                const meta = ACTION_META[log.action] ?? { label: log.action, icon: "📋", color: "#F3F4F6" };
                return (
                  <tr key={log.id} className="audit-row">
                    <td className="audit-id">{log.id}</td>
                    <td>
                      <span className="audit-badge" style={{ background: meta.color }}>
                        {meta.icon} {meta.label}
                      </span>
                    </td>
                    <td className="audit-user">{log.userName ?? "—"}</td>
                    <td className="audit-details" title={JSON.stringify(log.details ?? {})}>
                      {formatDetails(log.details)}
                    </td>
                    <td className="audit-ip">{log.ip ?? "—"}</td>
                    <td className="audit-date">
                      {new Date(log.createdAt).toLocaleString("es-AR", {
                        day: "2-digit", month: "2-digit", year: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && (
        <p className="audit-count">{visible.length} registro{visible.length !== 1 ? "s" : ""}</p>
      )}
    </div>
  );
}
