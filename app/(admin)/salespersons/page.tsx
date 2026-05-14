"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Salesperson {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  defaultCommission: number;
  status: string;
  _count: { clientLinks: number; orders: number };
}

// ── Create Modal ────────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", defaultCommission: "5" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/salespersons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:              form.name.trim(),
          email:             form.email.trim() || null,
          phone:             form.phone.trim() || null,
          defaultCommission: Number(form.defaultCommission),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Error al crear");
      }
      onCreated();
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
          <h2 className="sp-modal-title">Nuevo Vendedor</h2>
          <button className="sp-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="sp-modal-body">
          {error && <div className="sp-error">{error}</div>}
          <div className="sp-field">
            <label className="sp-label">Nombre *</label>
            <input className="sp-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Nombre completo" />
          </div>
          <div className="sp-field">
            <label className="sp-label">Email</label>
            <input className="sp-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="vendedor@ejemplo.com" />
          </div>
          <div className="sp-field">
            <label className="sp-label">Teléfono</label>
            <input className="sp-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+54 11 1234-5678" />
          </div>
          <div className="sp-field">
            <label className="sp-label">Comisión por defecto (%)</label>
            <input className="sp-input" type="number" min="0" max="100" step="0.5" value={form.defaultCommission} onChange={(e) => setForm({ ...form, defaultCommission: e.target.value })} />
          </div>
          <div className="sp-modal-actions">
            <button type="button" className="sp-btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="sp-btn-save" disabled={saving}>
              {saving ? "Guardando…" : "Crear Vendedor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function SalespersonsPage() {
  const router = useRouter();
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [loading, setLoading]   = useState(true);
  const [q, setQ]               = useState("");
  const [status, setStatus]     = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q)      params.set("q", q);
    if (status) params.set("status", status);
    const res  = await fetch(`/api/admin/salespersons?${params}`);
    const data = await res.json();
    setSalespersons(data.salespersons ?? []);
    setLoading(false);
  }, [q, status]);

  useEffect(() => { load(); }, [load]);

  async function toggleStatus(sp: Salesperson) {
    const newStatus = sp.status === "active" ? "inactive" : "active";
    await fetch(`/api/admin/salespersons/${sp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    load();
  }

  return (
    <div className="sp-page">
      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreated={load} />
      )}

      <div className="sp-header">
        <div>
          <h1 className="sp-title">Vendedores</h1>
          <p className="sp-subtitle">{salespersons.length} vendedores registrados</p>
        </div>
        <button className="sp-btn-new" onClick={() => setShowCreate(true)}>
          + Nuevo Vendedor
        </button>
      </div>

      {/* Filters */}
      <div className="sp-filters">
        <input
          className="sp-search"
          placeholder="Buscar por nombre, email, teléfono…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="sp-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="sp-loading">Cargando…</div>
      ) : salespersons.length === 0 ? (
        <div className="sp-empty">No hay vendedores{q ? " con esa búsqueda" : ""}.</div>
      ) : (
        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Contacto</th>
                <th>Comisión</th>
                <th>Clientes</th>
                <th>Pedidos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {salespersons.map((sp) => (
                <tr key={sp.id}>
                  <td>
                    <div className="sp-name">{sp.name}</div>
                  </td>
                  <td>
                    <div className="sp-contact">
                      {sp.email && <span>{sp.email}</span>}
                      {sp.phone && <span className="sp-phone">{sp.phone}</span>}
                    </div>
                  </td>
                  <td>
                    <span className="sp-commission-badge">{sp.defaultCommission}%</span>
                  </td>
                  <td>{sp._count.clientLinks}</td>
                  <td>{sp._count.orders}</td>
                  <td>
                    <span className={`sp-status-badge sp-status-badge--${sp.status}`}>
                      {sp.status === "active" ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>
                    <div className="sp-actions">
                      <button
                        className="sp-btn-detail"
                        onClick={() => router.push(`/salespersons/${sp.id}`)}
                      >
                        Ver
                      </button>
                      <button
                        className={`sp-btn-toggle${sp.status === "active" ? "" : " sp-btn-toggle--on"}`}
                        onClick={() => toggleStatus(sp)}
                      >
                        {sp.status === "active" ? "Desactivar" : "Activar"}
                      </button>
                    </div>
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
