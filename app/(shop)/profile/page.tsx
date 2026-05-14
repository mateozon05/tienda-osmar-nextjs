"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UserProfile {
  id: number;
  email: string | null;
  clientCode: string | null;
  name: string;
  company: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  taxId: string | null;
  role: string;
  status: string;
  lastLogin: string | null;
  createdAt: string;
  priceList: { id: number; name: string; discountPercentage: number | null } | null;
  _count: { orders: number };
}

interface Order {
  id: number;
  status: string;
  total: number;
  createdAt: string;
  paymentMethod: string;
  items: { quantity: number; product: { name: string } }[];
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtMoney(n: number) {
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 0 });
}

const ORDER_STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pendiente:  { label: "Pendiente",   cls: "prof-order-status prof-order-status--pending"   },
  confirmado: { label: "Confirmado",  cls: "prof-order-status prof-order-status--confirmed" },
  enviado:    { label: "Enviado",     cls: "prof-order-status prof-order-status--shipped"   },
  entregado:  { label: "Entregado",   cls: "prof-order-status prof-order-status--delivered" },
  cancelado:  { label: "Cancelado",   cls: "prof-order-status prof-order-status--cancelled" },
};

export default function ProfilePage() {
  const router = useRouter();
  const [user,    setUser]    = useState<UserProfile | null>(null);
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [tab,     setTab]     = useState<"datos" | "pedidos" | "password">("datos");
  const [loading, setLoading] = useState(true);

  // Form states
  const [form, setForm] = useState({ name: "", company: "", phone: "", address: "", city: "" });
  const [pwForm, setPwForm] = useState({ current: "", new_: "", confirm: "" });
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/profile");
      if (res.status === 401) { router.push("/login"); return; }
      if (!res.ok) return;
      const data = await res.json();
      setUser(data.user);
      setForm({
        name:    data.user.name    ?? "",
        company: data.user.company ?? "",
        phone:   data.user.phone   ?? "",
        address: data.user.address ?? "",
        city:    data.user.city    ?? "",
      });
      setLoading(false);

      // Fetch orders
      const ordRes = await fetch("/api/orders");
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setOrders(ordData.orders ?? []);
      }
    }
    load();
  }, [router]);

  async function handleSaveDatos(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ type: "err", text: data.error }); return; }
      setUser((u) => u ? { ...u, ...data.user } : u);
      setMsg({ type: "ok", text: "✅ Datos actualizados correctamente" });
    } catch {
      setMsg({ type: "err", text: "Error al guardar" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.new_ !== pwForm.confirm) {
      setMsg({ type: "err", text: "Las contraseñas no coinciden" });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.new_ }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ type: "err", text: data.error }); return; }
      setPwForm({ current: "", new_: "", confirm: "" });
      setMsg({ type: "ok", text: "✅ Contraseña actualizada" });
    } catch {
      setMsg({ type: "err", text: "Error al cambiar contraseña" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="prof-loading">Cargando perfil…</div>;
  if (!user)   return null;

  return (
    <div className="prof-page">
      {/* ── Header ── */}
      <div className="prof-header">
        <div className="prof-avatar">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="prof-header-info">
          <h1 className="prof-title">{user.name}</h1>
          <div className="prof-meta">
            {user.clientCode && (
              <span className="prof-chip prof-chip--code">
                Cliente #{user.clientCode}
              </span>
            )}
            {user.priceList && (
              <span className="prof-chip prof-chip--price">
                {user.priceList.name}
                {user.priceList.discountPercentage
                  ? ` (${user.priceList.discountPercentage}% desc.)`
                  : ""}
              </span>
            )}
            <span className="prof-chip prof-chip--orders">
              {user._count.orders} pedidos
            </span>
          </div>
        </div>
        <Link href="/" className="prof-back-btn">← Volver a la tienda</Link>
      </div>

      {/* ── Tabs ── */}
      <div className="prof-tabs">
        {([
          { id: "datos",    label: "📋 Mis datos"   },
          { id: "pedidos",  label: "📦 Mis pedidos" },
          { id: "password", label: "🔑 Contraseña"  },
        ] as const).map((t) => (
          <button
            key={t.id}
            className={`prof-tab${tab === t.id ? " active" : ""}`}
            onClick={() => { setTab(t.id); setMsg(null); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {msg && (
        <div className={`prof-msg prof-msg--${msg.type}`}>{msg.text}</div>
      )}

      {/* ── Tab: Datos ── */}
      {tab === "datos" && (
        <form className="prof-form" onSubmit={handleSaveDatos}>
          <div className="prof-form-grid">
            <div className="prof-field">
              <label className="prof-label">Nombre completo *</label>
              <input
                className="prof-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="prof-field">
              <label className="prof-label">Empresa / Razón social</label>
              <input
                className="prof-input"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Tu empresa"
              />
            </div>
            <div className="prof-field">
              <label className="prof-label">Teléfono</label>
              <input
                className="prof-input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+54 11 1234-5678"
              />
            </div>
            <div className="prof-field">
              <label className="prof-label">Ciudad</label>
              <input
                className="prof-input"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Ej: Tigre"
              />
            </div>
            <div className="prof-field prof-field--full">
              <label className="prof-label">Dirección</label>
              <input
                className="prof-input"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Calle, número, piso"
              />
            </div>

            {/* Read-only info */}
            {(user.email || user.clientCode || user.taxId) && (
              <div className="prof-field prof-field--full">
                <div className="prof-readonly-group">
                  {user.email && (
                    <div className="prof-readonly-item">
                      <span className="prof-readonly-label">Email</span>
                      <span className="prof-readonly-val">{user.email}</span>
                    </div>
                  )}
                  {user.clientCode && (
                    <div className="prof-readonly-item">
                      <span className="prof-readonly-label">N° de cliente</span>
                      <span className="prof-readonly-val">{user.clientCode}</span>
                    </div>
                  )}
                  {user.taxId && (
                    <div className="prof-readonly-item">
                      <span className="prof-readonly-label">CUIT/DNI</span>
                      <span className="prof-readonly-val">{user.taxId}</span>
                    </div>
                  )}
                  <div className="prof-readonly-item">
                    <span className="prof-readonly-label">Último acceso</span>
                    <span className="prof-readonly-val">{fmtDate(user.lastLogin)}</span>
                  </div>
                </div>
                <p className="prof-readonly-note">
                  Para cambiar estos datos contactá a ventas@distribuidoraosmar.com
                </p>
              </div>
            )}
          </div>

          <div className="prof-form-footer">
            <button type="submit" className="prof-save-btn" disabled={saving}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      )}

      {/* ── Tab: Pedidos ── */}
      {tab === "pedidos" && (
        <div className="prof-orders">
          {orders.length === 0 ? (
            <div className="prof-empty">
              <span style={{ fontSize: 40 }}>📦</span>
              <p>Todavía no realizaste ningún pedido.</p>
              <Link href="/" className="prof-cta-link">Ver catálogo →</Link>
            </div>
          ) : (
            orders.map((o) => {
              const st = ORDER_STATUS_LABEL[o.status] ?? { label: o.status, cls: "prof-order-status" };
              return (
                <div key={o.id} className="prof-order-card">
                  <div className="prof-order-head">
                    <div>
                      <div className="prof-order-num">Pedido #{o.id}</div>
                      <div className="prof-order-date">{fmtDate(o.createdAt)}</div>
                    </div>
                    <div className="prof-order-right">
                      <span className={st.cls}>{st.label}</span>
                      <div className="prof-order-total">{fmtMoney(o.total)}</div>
                    </div>
                  </div>
                  <div className="prof-order-items">
                    {o.items.slice(0, 3).map((item, i) => (
                      <span key={i} className="prof-order-item">
                        {item.quantity}× {item.product.name}
                      </span>
                    ))}
                    {o.items.length > 3 && (
                      <span className="prof-order-item prof-order-item--more">
                        +{o.items.length - 3} más
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Tab: Contraseña ── */}
      {tab === "password" && (
        <form className="prof-form prof-form--narrow" onSubmit={handleSavePassword}>
          {user.clientCode && (
            <div className="prof-info-box">
              <strong>💡 Tu contraseña inicial</strong> era tu número de cliente
              (<code>{user.clientCode}</code>). Podés cambiarla aquí.
            </div>
          )}
          <div className="prof-field">
            <label className="prof-label">Contraseña actual</label>
            <input
              type="password"
              className="prof-input"
              value={pwForm.current}
              onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="prof-field">
            <label className="prof-label">Nueva contraseña</label>
            <input
              type="password"
              className="prof-input"
              value={pwForm.new_}
              onChange={(e) => setPwForm({ ...pwForm, new_: e.target.value })}
              autoComplete="new-password"
              minLength={6}
              required
            />
            <small className="prof-help">Mínimo 6 caracteres</small>
          </div>
          <div className="prof-field">
            <label className="prof-label">Confirmar nueva contraseña</label>
            <input
              type="password"
              className="prof-input"
              value={pwForm.confirm}
              onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="prof-form-footer">
            <button type="submit" className="prof-save-btn" disabled={saving}>
              {saving ? "Cambiando…" : "Cambiar contraseña"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
