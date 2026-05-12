"use client";

import { useEffect, useState, useCallback } from "react";

type AdminRow = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "superadmin";
  status: string;
  lastLogin: string | null;
  createdAt: string;
};

type CreateForm = {
  name: string;
  email: string;
  password: string;
  role: "admin" | "superadmin";
};

// ── Helpers ──────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return "Nunca";
  const d = new Date(iso);
  return d.toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Sub-components ────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`adm-role-badge${role === "superadmin" ? " adm-role-badge--super" : ""}`}>
      {role === "superadmin" ? "👑 Superadmin" : "⚙️ Admin"}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "approved";
  return (
    <span className={`adm-status-badge${isActive ? " adm-status-badge--active" : " adm-status-badge--inactive"}`}>
      {isActive ? "Activo" : "Inactivo"}
    </span>
  );
}

// ── Create Modal ──────────────────────────────────────────────────────

function CreateAdminModal({
  onClose, onCreated,
}: {
  onClose: () => void;
  onCreated: (admin: AdminRow) => void;
}) {
  const [form, setForm] = useState<CreateForm>({ name: "", email: "", password: "", role: "admin" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al crear admin"); setLoading(false); return; }
      onCreated(data.admin);
    } catch {
      setError("Error de conexión");
      setLoading(false);
    }
  }

  const canSubmit = form.name.trim() && form.email.trim() && form.password.length >= 8;

  return (
    <div className="adm-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="adm-modal">
        <div className="adm-modal-head">
          <h2 className="adm-modal-title">Nuevo Administrador</h2>
          <button className="adm-modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {error && <div className="adm-modal-error">{error}</div>}

        <div className="adm-modal-body">
          <label className="adm-label">Nombre</label>
          <input
            className="adm-input"
            type="text"
            placeholder="Nombre completo"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />

          <label className="adm-label">Email</label>
          <input
            className="adm-input"
            type="email"
            placeholder="email@ejemplo.com"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          />

          <label className="adm-label">Contraseña temporal</label>
          <input
            className="adm-input"
            type="text"
            placeholder="Mínimo 8 caracteres"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          />
          <p className="adm-hint">El admin deberá cambiarla en su primer ingreso</p>

          <label className="adm-label">Rol</label>
          <select
            className="adm-input"
            value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value as "admin" | "superadmin" }))}
          >
            <option value="admin">⚙️ Admin</option>
            <option value="superadmin">👑 Superadmin</option>
          </select>
        </div>

        <div className="adm-modal-foot">
          <button className="adm-btn adm-btn--ghost" onClick={onClose}>Cancelar</button>
          <button
            className="adm-btn adm-btn--primary"
            onClick={handleCreate}
            disabled={loading || !canSubmit}
          >
            {loading ? "Creando…" : "Crear Admin"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────

export default function AdminsPage() {
  const [admins, setAdmins]         = useState<AdminRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [currentId, setCurrentId]   = useState<number | null>(null);

  // Get current user id to prevent self-modification
  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(d => d?.user?.id && setCurrentId(d.user.id))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/admins");
      const data = await res.json();
      setAdmins(data.admins ?? []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function patchAdmin(id: number, patch: { role?: string; status?: string }) {
    setSaving(id);
    try {
      const res = await fetch(`/api/admin/admins/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (res.ok) {
        setAdmins(prev => prev.map(a => a.id === id ? { ...a, ...data.admin } : a));
      }
    } catch {}
    setSaving(null);
  }

  function handleCreated(admin: AdminRow) {
    setAdmins(prev => [...prev, admin]);
    setShowCreate(false);
  }

  return (
    <div className="au-page">
      {/* Header */}
      <div className="au-header">
        <div>
          <h1 className="au-title">Administradores</h1>
          <p className="au-sub">Gestioná quién tiene acceso al panel</p>
        </div>
        <div className="adm-header-actions">
          <button className="au-refresh-btn" onClick={load} title="Recargar">🔄</button>
          <button className="adm-btn adm-btn--primary" onClick={() => setShowCreate(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuevo Admin
          </button>
        </div>
      </div>

      {loading ? (
        <div className="au-loading">Cargando administradores…</div>
      ) : (
        <div className="au-table-wrap">
          <table className="au-table">
            <thead>
              <tr>
                <th>Admin</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Último acceso</th>
                <th>Registro</th>
                <th className="au-th-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 && (
                <tr><td colSpan={6} className="au-empty">No hay administradores</td></tr>
              )}
              {admins.map(admin => {
                const isSelf = admin.id === currentId;
                const isActive = admin.status === "approved";

                return (
                  <tr key={admin.id} className="au-row">
                    {/* Info */}
                    <td>
                      <div className="au-cell-user">
                        <div className={`au-avatar${admin.role === "superadmin" ? " au-avatar--super" : ""}`}>
                          {admin.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="au-user-name">
                            {admin.name}
                            {isSelf && <span className="adm-self-tag"> (vos)</span>}
                          </div>
                          <div className="au-user-email">{admin.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Rol */}
                    <td>
                      {isSelf ? (
                        <RoleBadge role={admin.role} />
                      ) : (
                        <select
                          className="adm-role-select"
                          value={admin.role}
                          disabled={saving === admin.id}
                          onChange={e => patchAdmin(admin.id, { role: e.target.value })}
                        >
                          <option value="admin">⚙️ Admin</option>
                          <option value="superadmin">👑 Superadmin</option>
                        </select>
                      )}
                    </td>

                    {/* Estado */}
                    <td><StatusBadge status={admin.status} /></td>

                    {/* Último acceso */}
                    <td className="au-cell-date adm-last-login">
                      {fmtDate(admin.lastLogin)}
                    </td>

                    {/* Registro */}
                    <td className="au-cell-date">
                      {new Date(admin.createdAt).toLocaleDateString("es-AR", {
                        day: "2-digit", month: "2-digit", year: "2-digit",
                      })}
                    </td>

                    {/* Acciones */}
                    <td className="au-cell-actions">
                      {isSelf ? (
                        <span className="au-no-data">Tu cuenta</span>
                      ) : (
                        <button
                          className={`au-btn${isActive ? " au-btn--reject" : " au-btn--approve"}`}
                          disabled={saving === admin.id}
                          onClick={() => patchAdmin(admin.id, { status: isActive ? "inactive" : "approved" })}
                        >
                          {saving === admin.id ? "…" : isActive ? "Desactivar" : "Activar"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateAdminModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
