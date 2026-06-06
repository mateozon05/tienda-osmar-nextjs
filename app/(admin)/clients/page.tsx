"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Client {
  id: number;
  clientCode: string | null;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  taxId: string | null;
  address: string | null;
  status: string;
  lastLogin: string | null;
  createdAt: string;
  priceList: { id: number; name: string; type: string } | null;
  saphirusPriceList: { id: number; name: string; type: string } | null;
  salesperson: { id: number; name: string } | null;
  _count: { orders: number };
}

interface PriceList {
  id: number;
  name: string;
  type: string;
}

interface SalespersonOption {
  id: number;
  name: string;
  defaultCommission: number;
}

// ── SVG icons ─────────────────────────────────────────────────────────────────
function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  );
}
function IconRefresh() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
    </svg>
  );
}
function IconUser() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    approved: { label: "Activo",    cls: "cli-badge cli-badge--active" },
    pending:  { label: "Pendiente", cls: "cli-badge cli-badge--pending" },
    rejected: { label: "Rechazado", cls: "cli-badge cli-badge--rejected" },
    inactive: { label: "Inactivo",  cls: "cli-badge cli-badge--inactive" },
  };
  const s = map[status] ?? { label: status, cls: "cli-badge" };
  return <span className={s.cls}>{s.label}</span>;
}

// ── Detail modal ──────────────────────────────────────────────────────────────
interface DetailModalProps {
  client: Client;
  priceLists: PriceList[];
  salespersons: SalespersonOption[];
  onClose: () => void;
  onUpdated: (c: Client) => void;
}
function DetailModal({ client, priceLists, salespersons, onClose, onUpdated }: DetailModalProps) {
  const [status,              setStatus]              = useState(client.status);
  const [priceListId,         setPriceListId]         = useState(client.priceList?.id?.toString() ?? "");
  const [saphirusPriceListId, setSaphirusPriceListId] = useState(client.saphirusPriceList?.id?.toString() ?? "");
  const [salespersonId,       setSalespersonId]       = useState(client.salesperson?.id?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [msg,    setMsg]    = useState("");

  const generalLists  = priceLists.filter((pl) => pl.type === "general");
  const saphirusLists = priceLists.filter((pl) => pl.type === "saphirus");

  async function handleSave() {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          priceListId:         priceListId         || null,
          saphirusPriceListId: saphirusPriceListId || null,
          salespersonId:       salespersonId       || null,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      const updated = await res.json();
      const pl  = priceLists.find((p) => p.id === updated.priceListId)         ?? null;
      const spl = priceLists.find((p) => p.id === updated.saphirusPriceListId) ?? null;
      const sp  = salespersons.find((s) => s.id === updated.salespersonId)     ?? null;
      onUpdated({ ...client, status: updated.status, priceList: pl, saphirusPriceList: spl, salesperson: sp });
      setMsg("✅ Guardado");
      setTimeout(onClose, 800);
    } catch {
      setMsg("❌ Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="cli-modal-overlay" onClick={onClose}>
      <div className="cli-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cli-modal-header">
          <div>
            <div className="cli-modal-title">
              <IconUser /> {client.name}
            </div>
            {client.clientCode && (
              <div className="cli-modal-code">Cliente #{client.clientCode}</div>
            )}
          </div>
          <button className="cli-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="cli-modal-body">
          {/* Info section */}
          <div className="cli-modal-section">
            <h4 className="cli-modal-section-title">Datos</h4>
            <div className="cli-info-grid">
              <div className="cli-info-item">
                <span className="cli-info-label">Empresa</span>
                <span className="cli-info-val">{client.company || "—"}</span>
              </div>
              <div className="cli-info-item">
                <span className="cli-info-label">Email</span>
                <span className="cli-info-val">{client.email || "—"}</span>
              </div>
              <div className="cli-info-item">
                <span className="cli-info-label">Teléfono</span>
                <span className="cli-info-val">{client.phone || "—"}</span>
              </div>
              <div className="cli-info-item">
                <span className="cli-info-label">Ciudad</span>
                <span className="cli-info-val">{client.city || "—"}</span>
              </div>
              <div className="cli-info-item">
                <span className="cli-info-label">Dirección</span>
                <span className="cli-info-val">{client.address || "—"}</span>
              </div>
              <div className="cli-info-item">
                <span className="cli-info-label">CUIT/DNI</span>
                <span className="cli-info-val">{client.taxId || "—"}</span>
              </div>
              <div className="cli-info-item">
                <span className="cli-info-label">Pedidos</span>
                <span className="cli-info-val">{client._count.orders}</span>
              </div>
              <div className="cli-info-item">
                <span className="cli-info-label">Último acceso</span>
                <span className="cli-info-val">{fmtDate(client.lastLogin)}</span>
              </div>
              <div className="cli-info-item">
                <span className="cli-info-label">Registrado</span>
                <span className="cli-info-val">{fmtDate(client.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Edit section */}
          <div className="cli-modal-section">
            <h4 className="cli-modal-section-title">Configuración</h4>
            <div className="cli-modal-field">
              <label className="cli-modal-label">Estado</label>
              <select
                className="cli-modal-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="approved">✅ Activo</option>
                <option value="pending">⏳ Pendiente</option>
                <option value="inactive">🚫 Inactivo</option>
                <option value="rejected">❌ Rechazado</option>
              </select>
            </div>
            <div className="cli-modal-field">
              <label className="cli-modal-label">Lista general</label>
              <select
                className="cli-modal-select"
                value={priceListId}
                onChange={(e) => setPriceListId(e.target.value)}
              >
                <option value="">— Sin lista general —</option>
                {generalLists.map((pl) => (
                  <option key={pl.id} value={pl.id}>{pl.name}</option>
                ))}
              </select>
            </div>
            <div className="cli-modal-field">
              <label className="cli-modal-label">Lista Saphirus</label>
              <select
                className="cli-modal-select"
                value={saphirusPriceListId}
                onChange={(e) => setSaphirusPriceListId(e.target.value)}
              >
                <option value="">— Sin lista Saphirus —</option>
                {saphirusLists.map((pl) => (
                  <option key={pl.id} value={pl.id}>{pl.name}</option>
                ))}
              </select>
            </div>
            <div className="cli-modal-field">
              <label className="cli-modal-label">Vendedor asignado</label>
              <select
                className="cli-modal-select"
                value={salespersonId}
                onChange={(e) => setSalespersonId(e.target.value)}
              >
                <option value="">— Sin vendedor —</option>
                {salespersons.map((sp) => (
                  <option key={sp.id} value={sp.id}>{sp.name} ({sp.defaultCommission}%)</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="cli-modal-footer">
          {msg && <span className="cli-modal-msg">{msg}</span>}
          <div style={{ flex: 1 }} />
          <button className="cli-btn cli-btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="cli-btn cli-btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const [clients,      setClients]      = useState<Client[]>([]);
  const [total,        setTotal]        = useState(0);
  const [priceLists,   setPriceLists]   = useState<PriceList[]>([]);
  const [salespersons, setSalespersons] = useState<SalespersonOption[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page,       setPage]       = useState(1);
  const [selected,   setSelected]   = useState<Client | null>(null);
  const LIMIT = 50;

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        ...(search       && { q:      search }),
        ...(statusFilter && { status: statusFilter }),
      });
      const res = await fetch(`/api/admin/clients?${params}`);
      const data = await res.json();
      setClients(data.clients ?? []);
      setTotal(data.total ?? 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  useEffect(() => {
    fetch("/api/admin/price-lists")
      .then((r) => r.json())
      .then((d) => setPriceLists(d.priceLists ?? []));
    fetch("/api/admin/salespersons?status=active")
      .then((r) => r.json())
      .then((d) => setSalespersons(d.salespersons ?? []));
  }, []);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  function handleUpdated(updated: Client) {
    setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelected(null);
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="cli-page">
      {/* Header */}
      <div className="cli-header">
        <div>
          <h1 className="cli-title">👥 Clientes</h1>
          <p className="cli-subtitle">{total.toLocaleString("es-AR")} clientes en total</p>
        </div>
        <button className="cli-refresh-btn" onClick={fetchClients} title="Actualizar">
          <IconRefresh /> Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="cli-filters">
        <div className="cli-search-wrap">
          <IconSearch />
          <input
            type="text"
            className="cli-search"
            placeholder="Buscar por nombre, código, empresa, ciudad…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="cli-status-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="approved">Activos</option>
          <option value="pending">Pendientes</option>
          <option value="inactive">Inactivos</option>
          <option value="rejected">Rechazados</option>
        </select>
      </div>

      {/* Table */}
      <div className="cli-table-wrap">
        <table className="cli-table">
          <thead>
            <tr>
              <th>N° Cliente</th>
              <th>Nombre / Empresa</th>
              <th>Contacto</th>
              <th>Ciudad</th>
              <th>Lista precios</th>
              <th>Vendedor</th>
              <th>Pedidos</th>
              <th>Estado</th>
              <th>Último acceso</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="cli-td-center">Cargando…</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan={9} className="cli-td-center">No hay clientes que coincidan.</td></tr>
            ) : clients.map((c) => (
              <tr key={c.id} className="cli-row">
                <td>
                  <span className="cli-code">
                    {c.clientCode ?? <span className="cli-no-code">—</span>}
                  </span>
                </td>
                <td>
                  <div className="cli-name">{c.name}</div>
                  {c.company && <div className="cli-company">{c.company}</div>}
                </td>
                <td>
                  {c.email && <div className="cli-contact">{c.email}</div>}
                  {c.phone && <div className="cli-contact">{c.phone}</div>}
                </td>
                <td>{c.city || "—"}</td>
                <td>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {c.priceList
                      ? <span className="cli-pricelist">{c.priceList.name}</span>
                      : <span className="cli-no-pricelist">—</span>}
                    {c.saphirusPriceList && (
                      <span className="cli-pricelist" style={{ fontSize: 11, opacity: 0.8 }}>
                        🟢 {c.saphirusPriceList.name}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  {c.salesperson
                    ? <span className="cli-salesperson">{c.salesperson.name}</span>
                    : <span className="cli-no-pricelist">—</span>}
                </td>
                <td className="cli-td-center">
                  <span className="cli-orders-count">{c._count.orders}</span>
                </td>
                <td><StatusBadge status={c.status} /></td>
                <td className="cli-td-muted">{fmtDate(c.lastLogin)}</td>
                <td>
                  <button
                    className="cli-edit-btn"
                    onClick={() => setSelected(c)}
                    title="Ver / editar"
                  >
                    Ver →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="cli-pagination">
          <button
            className="cli-btn cli-btn--ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Anterior
          </button>
          <span className="cli-page-info">
            Página {page} de {totalPages}
          </span>
          <button
            className="cli-btn cli-btn--ghost"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <DetailModal
          client={selected}
          priceLists={priceLists}
          salespersons={salespersons}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
