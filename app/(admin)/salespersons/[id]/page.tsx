"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";

interface Salesperson {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  defaultCommission: number;
  status: string;
  _count: { orders: number };
  clientLinks: ClientLink[];
}

interface ClientLink {
  id: number;
  commission: number | null;
  client: {
    id: number;
    clientCode: string | null;
    name: string;
    company: string | null;
    email: string | null;
    city: string | null;
    _count?: { orders: number };
  };
}

interface CommissionData {
  summary: { orderCount: number; totalSales: number; totalCommission: number };
  byClient: { clientCode: string; name: string; company: string | null; sales: number; commission: number; orderCount: number }[];
  orders: { id: number; createdAt: string; status: string; total: number; commissionRate: number | null; commissionAmount: number | null; clientCode: string | null; clientName: string }[];
}

interface SearchUser {
  id: number;
  clientCode: string | null;
  name: string;
  company: string | null;
  email: string | null;
  city: string | null;
}

function fmt(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

// ── Edit Salesperson Modal ───────────────────────────────────────────────────
function EditModal({ sp, onClose, onSaved }: { sp: Salesperson; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: sp.name,
    email: sp.email ?? "",
    phone: sp.phone ?? "",
    defaultCommission: String(sp.defaultCommission),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/salespersons/${sp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:              form.name.trim(),
          email:             form.email.trim() || null,
          phone:             form.phone.trim() || null,
          defaultCommission: Number(form.defaultCommission),
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Error"); }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sp-overlay" onClick={onClose}>
      <div className="sp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sp-modal-head">
          <h2 className="sp-modal-title">Editar Vendedor</h2>
          <button className="sp-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="sp-modal-body">
          {error && <div className="sp-error">{error}</div>}
          <div className="sp-field">
            <label className="sp-label">Nombre *</label>
            <input className="sp-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="sp-field">
            <label className="sp-label">Email</label>
            <input className="sp-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="sp-field">
            <label className="sp-label">Teléfono</label>
            <input className="sp-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="sp-field">
            <label className="sp-label">Comisión por defecto (%)</label>
            <input className="sp-input" type="number" min="0" max="100" step="0.5" value={form.defaultCommission} onChange={(e) => setForm({ ...form, defaultCommission: e.target.value })} />
          </div>
          <div className="sp-modal-actions">
            <button type="button" className="sp-btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="sp-btn-save" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Assign Client Modal ──────────────────────────────────────────────────────
function AssignClientModal({
  salespersonId,
  defaultCommission,
  existingClientIds,
  onClose,
  onAssigned,
}: {
  salespersonId: number;
  defaultCommission: number;
  existingClientIds: number[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [q, setQ]           = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [selected, setSelected] = useState<SearchUser | null>(null);
  const [commission, setCommission] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      const res  = await fetch(`/api/admin/clients?q=${encodeURIComponent(q)}&limit=10`);
      const data = await res.json();
      setResults((data.clients ?? []).filter((c: SearchUser) => !existingClientIds.includes(c.id)));
    }, 300);
    return () => clearTimeout(timer);
  }, [q, existingClientIds]);

  async function handleAssign() {
    if (!selected) return;
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/salespersons/${salespersonId}/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId:   selected.id,
          commission: commission !== "" ? Number(commission) : null,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Error"); }
      onAssigned();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sp-overlay" onClick={onClose}>
      <div className="sp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sp-modal-head">
          <h2 className="sp-modal-title">Asignar Cliente</h2>
          <button className="sp-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="sp-modal-body">
          {error && <div className="sp-error">{error}</div>}
          <div className="sp-field">
            <label className="sp-label">Buscar cliente (nombre, código, empresa…)</label>
            <input className="sp-input" value={q} onChange={(e) => { setQ(e.target.value); setSelected(null); }} placeholder="Ej: 1254 o Juan García" autoFocus />
          </div>

          {results.length > 0 && !selected && (
            <div className="sp-search-results">
              {results.map((c) => (
                <button key={c.id} className="sp-search-result-item" onClick={() => { setSelected(c); setQ(c.name); setResults([]); }}>
                  <strong>[{c.clientCode}]</strong> {c.name}
                  {c.company && <span className="sp-search-company"> — {c.company}</span>}
                  {c.city && <span className="sp-search-city"> ({c.city})</span>}
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="sp-selected-client">
              ✅ <strong>[{selected.clientCode}]</strong> {selected.name}
              {selected.company && <span> — {selected.company}</span>}
            </div>
          )}

          <div className="sp-field">
            <label className="sp-label">
              Comisión específica (%) — dejar vacío para usar {defaultCommission}% (default)
            </label>
            <input
              className="sp-input"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              placeholder={`Default: ${defaultCommission}%`}
            />
          </div>

          <div className="sp-modal-actions">
            <button type="button" className="sp-btn-cancel" onClick={onClose}>Cancelar</button>
            <button className="sp-btn-save" onClick={handleAssign} disabled={!selected || saving}>
              {saving ? "Asignando…" : "Asignar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function SalespersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [sp, setSp]           = useState<Salesperson | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<"clients" | "orders" | "commission">("clients");
  const [showEdit, setShowEdit]     = useState(false);
  const [showAssign, setShowAssign] = useState(false);

  // Commission filter state
  const [from, setFrom]   = useState("");
  const [to, setTo]       = useState("");
  const [comStatus, setComStatus] = useState("");
  const [commData, setCommData]   = useState<CommissionData | null>(null);
  const [commLoading, setCommLoading] = useState(false);

  const loadSp = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/admin/salespersons/${id}`);
    const data = await res.json();
    setSp(data.salesperson ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => { loadSp(); }, [loadSp]);

  async function loadCommission() {
    if (!sp) return;
    setCommLoading(true);
    const params = new URLSearchParams();
    if (from)      params.set("from", from);
    if (to)        params.set("to", to);
    if (comStatus) params.set("status", comStatus);
    const res  = await fetch(`/api/admin/salespersons/${id}/commission?${params}`);
    const data = await res.json();
    setCommData(data);
    setCommLoading(false);
  }

  useEffect(() => {
    if (tab === "commission" && sp) loadCommission();
  }, [tab, sp]); // eslint-disable-line react-hooks/exhaustive-deps

  async function removeClient(clientId: number) {
    if (!confirm("¿Quitar este cliente del vendedor?")) return;
    await fetch(`/api/admin/salespersons/${id}/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, action: "remove" }),
    });
    loadSp();
  }

  function exportExcel() {
    const params = new URLSearchParams();
    if (from)      params.set("from", from);
    if (to)        params.set("to", to);
    if (comStatus) params.set("status", comStatus);
    window.open(`/api/admin/salespersons/${id}/export?${params}`, "_blank");
  }

  if (loading) return <div className="sp-page"><div className="sp-loading">Cargando…</div></div>;
  if (!sp)     return <div className="sp-page"><div className="sp-empty">Vendedor no encontrado.</div></div>;

  const existingClientIds = sp.clientLinks.map((l) => l.client.id);

  return (
    <div className="sp-page">
      {showEdit   && <EditModal sp={sp} onClose={() => setShowEdit(false)} onSaved={loadSp} />}
      {showAssign && (
        <AssignClientModal
          salespersonId={sp.id}
          defaultCommission={sp.defaultCommission}
          existingClientIds={existingClientIds}
          onClose={() => setShowAssign(false)}
          onAssigned={loadSp}
        />
      )}

      {/* Header */}
      <div className="sp-detail-header">
        <button className="sp-btn-back" onClick={() => router.push("/salespersons")}>
          ← Volver
        </button>
        <div className="sp-detail-info">
          <h1 className="sp-title">{sp.name}</h1>
          <div className="sp-detail-meta">
            {sp.email && <span>📧 {sp.email}</span>}
            {sp.phone && <span>📞 {sp.phone}</span>}
            <span className="sp-commission-badge">{sp.defaultCommission}% comisión</span>
            <span className={`sp-status-badge sp-status-badge--${sp.status}`}>
              {sp.status === "active" ? "Activo" : "Inactivo"}
            </span>
          </div>
        </div>
        <button className="sp-btn-edit" onClick={() => setShowEdit(true)}>✏️ Editar</button>
      </div>

      {/* Tabs */}
      <div className="sp-tabs">
        <button className={`sp-tab${tab === "clients" ? " active" : ""}`} onClick={() => setTab("clients")}>
          👥 Clientes ({sp.clientLinks.length})
        </button>
        <button className={`sp-tab${tab === "commission" ? " active" : ""}`} onClick={() => setTab("commission")}>
          💰 Comisiones
        </button>
      </div>

      {/* Tab: Clients */}
      {tab === "clients" && (
        <div className="sp-tab-content">
          <div className="sp-tab-actions">
            <button className="sp-btn-new" onClick={() => setShowAssign(true)}>
              + Asignar Cliente
            </button>
          </div>

          {sp.clientLinks.length === 0 ? (
            <div className="sp-empty">No hay clientes asignados.</div>
          ) : (
            <div className="sp-table-wrap">
              <table className="sp-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre / Empresa</th>
                    <th>Ciudad</th>
                    <th>Comisión</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sp.clientLinks.map((link) => (
                    <tr key={link.id}>
                      <td><code className="sp-code">{link.client.clientCode ?? "-"}</code></td>
                      <td>
                        <div className="sp-name">{link.client.name}</div>
                        {link.client.company && <div className="sp-sub">{link.client.company}</div>}
                      </td>
                      <td>{link.client.city ?? "-"}</td>
                      <td>
                        {link.commission != null
                          ? <span className="sp-commission-badge sp-commission-badge--custom">{link.commission}%</span>
                          : <span className="sp-commission-badge sp-commission-badge--default">{sp.defaultCommission}% (default)</span>
                        }
                      </td>
                      <td>
                        <button className="sp-btn-remove" onClick={() => removeClient(link.client.id)}>
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Commission */}
      {tab === "commission" && (
        <div className="sp-tab-content">
          {/* Filters */}
          <div className="sp-comm-filters">
            <div className="sp-field-inline">
              <label className="sp-label">Desde</label>
              <input className="sp-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="sp-field-inline">
              <label className="sp-label">Hasta</label>
              <input className="sp-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="sp-field-inline">
              <label className="sp-label">Estado pedido</label>
              <select className="sp-select" value={comStatus} onChange={(e) => setComStatus(e.target.value)}>
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="confirmado">Confirmado</option>
                <option value="enviado">Enviado</option>
                <option value="entregado">Entregado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            <div className="sp-comm-filter-btns">
              <button className="sp-btn-save" onClick={loadCommission} disabled={commLoading}>
                {commLoading ? "Calculando…" : "Calcular"}
              </button>
              {commData && (
                <button className="sp-btn-export" onClick={exportExcel}>
                  📥 Excel
                </button>
              )}
            </div>
          </div>

          {commLoading && <div className="sp-loading">Calculando comisiones…</div>}

          {commData && !commLoading && (
            <>
              {/* Summary cards */}
              <div className="sp-comm-summary">
                <div className="sp-comm-card">
                  <div className="sp-comm-card-value">{commData.summary.orderCount}</div>
                  <div className="sp-comm-card-label">Pedidos</div>
                </div>
                <div className="sp-comm-card">
                  <div className="sp-comm-card-value">{fmt(commData.summary.totalSales)}</div>
                  <div className="sp-comm-card-label">Ventas Totales</div>
                </div>
                <div className="sp-comm-card sp-comm-card--highlight">
                  <div className="sp-comm-card-value">{fmt(commData.summary.totalCommission)}</div>
                  <div className="sp-comm-card-label">Comisión Total</div>
                </div>
              </div>

              {/* By client */}
              {commData.byClient.length > 0 && (
                <>
                  <h3 className="sp-section-title">Por cliente</h3>
                  <div className="sp-table-wrap">
                    <table className="sp-table">
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Cliente</th>
                          <th>Pedidos</th>
                          <th>Ventas</th>
                          <th>Comisión</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commData.byClient.map((c, i) => (
                          <tr key={i}>
                            <td><code className="sp-code">{c.clientCode || "-"}</code></td>
                            <td>
                              <div className="sp-name">{c.name}</div>
                              {c.company && <div className="sp-sub">{c.company}</div>}
                            </td>
                            <td>{c.orderCount}</td>
                            <td>{fmt(c.sales)}</td>
                            <td><strong>{fmt(c.commission)}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Order list */}
              {commData.orders.length > 0 && (
                <>
                  <h3 className="sp-section-title">Detalle de pedidos</h3>
                  <div className="sp-table-wrap">
                    <table className="sp-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Fecha</th>
                          <th>Cliente</th>
                          <th>Estado</th>
                          <th>Total</th>
                          <th>% Com.</th>
                          <th>Comisión</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commData.orders.map((o) => (
                          <tr key={o.id}>
                            <td>#{o.id}</td>
                            <td>{new Date(o.createdAt).toLocaleDateString("es-AR")}</td>
                            <td>
                              {o.clientCode && <code className="sp-code">[{o.clientCode}]</code>}{" "}
                              {o.clientName}
                            </td>
                            <td><span className={`sp-order-status sp-order-status--${o.status}`}>{o.status}</span></td>
                            <td>{fmt(o.total)}</td>
                            <td>{o.commissionRate ?? sp.defaultCommission}%</td>
                            <td><strong>{fmt(o.commissionAmount ?? (o.total * sp.defaultCommission / 100))}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {commData.orders.length === 0 && (
                <div className="sp-empty">No hay pedidos en este período.</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
