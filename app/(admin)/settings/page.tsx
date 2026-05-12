"use client";

import { useState, useEffect } from "react";

type Settings = Record<string, string>;

const TABS = [
  { id: "empresa",  label: "Empresa",      emoji: "🏢" },
  { id: "banco",    label: "Banco",        emoji: "🏦" },
  { id: "pagos",    label: "Métodos pago", emoji: "💳" },
  { id: "horarios", label: "Horarios",     emoji: "🕐" },
  { id: "redes",    label: "Redes",        emoji: "📱" },
  { id: "textos",   label: "Textos",       emoji: "🎨" },
  { id: "sistema",  label: "Sistema",      emoji: "🔧" },
];

function Field({
  label, value, onChange, placeholder = "", type = "text", helpText,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; helpText?: string;
}) {
  return (
    <div className="sett-field">
      <label className="sett-label">{label}</label>
      <input
        className="sett-input" type={type}
        value={value || ""} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
      {helpText && <p className="sett-help">{helpText}</p>}
    </div>
  );
}

function Toggle({
  label, description, value, onChange,
}: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className={`sett-toggle-row${value ? " sett-toggle-row--on" : ""}`}>
      <div className="sett-toggle-text">
        <p className="sett-toggle-label">{label}</p>
        <p className="sett-toggle-desc">{description}</p>
      </div>
      <button
        className={`sett-toggle-btn${value ? " sett-toggle-btn--on" : ""}`}
        onClick={() => onChange(!value)}
        aria-pressed={value}
        type="button"
      >
        <span className="sett-toggle-knob" />
      </button>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return <div className="sett-info-box">{children}</div>;
}

function StatusCard({ label, url }: { label: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="sett-status-card">
      <span className="sett-status-dot" />
      <span className="sett-status-label">{label}</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
        <polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/>
      </svg>
    </a>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [activeTab, setActiveTab] = useState("empresa");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(d => { setSettings(d.settings ?? {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true); setSaved(false);
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  }

  function set(key: string, value: string) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }
  function setBool(key: string, value: boolean) { set(key, value ? "true" : "false"); }
  function bool(key: string) {
    return key in settings ? settings[key] !== "false" : true;
  }

  if (loading) return <div className="au-loading">Cargando configuración…</div>;

  return (
    <div className="au-page">

      {/* Header */}
      <div className="au-header">
        <div>
          <h1 className="au-title">Configuración</h1>
          <p className="au-sub">Cambiá cualquier dato sin tocar código</p>
        </div>
        <button
          className={`sett-save-btn${saved ? " sett-save-btn--saved" : ""}`}
          onClick={handleSave}
          disabled={saving}
        >
          {saved ? (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
              Guardado
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/>
              </svg>
              {saving ? "Guardando…" : "Guardar cambios"}
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="sett-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`sett-tab${activeTab === tab.id ? " sett-tab--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.emoji}</span>
            <span className="sett-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Panel */}
      <div className="sett-panel">

        {activeTab === "empresa" && (
          <div className="sett-section">
            <h2 className="sett-section-title">🏢 Datos de la empresa</h2>
            <Field label="Nombre"         value={settings.company_name}    onChange={v => set("company_name", v)} />
            <Field label="Dirección"      value={settings.company_address} onChange={v => set("company_address", v)} />
            <Field label="Teléfono"       value={settings.company_phone}   onChange={v => set("company_phone", v)} placeholder="+54 9 11 XXXX-XXXX" />
            <Field label="Email"          value={settings.company_email}   onChange={v => set("company_email", v)} type="email" />
            <Field label="CUIT"           value={settings.company_cuit}    onChange={v => set("company_cuit", v)} placeholder="20-XXXXXXXX-X" />
            <Field label="Año fundación"  value={settings.company_founded} onChange={v => set("company_founded", v)} placeholder="1983" />
          </div>
        )}

        {activeTab === "banco" && (
          <div className="sett-section">
            <h2 className="sett-section-title">🏦 Cuenta bancaria</h2>
            <Field label="Banco"            value={settings.bank_name}   onChange={v => set("bank_name", v)}   placeholder="Ej: Banco Galicia" />
            <Field label="Titular"          value={settings.bank_holder} onChange={v => set("bank_holder", v)} />
            <Field label="CBU"              value={settings.bank_cbu}    onChange={v => set("bank_cbu", v)}    placeholder="22 dígitos" />
            <Field label="Alias"            value={settings.bank_alias}  onChange={v => set("bank_alias", v)}  placeholder="ALIAS.CUENTA.MP" />
            <Field label="CUIT del titular" value={settings.bank_cuit}   onChange={v => set("bank_cuit", v)}   placeholder="20-XXXXXXXX-X" />
            <InfoBox>💡 Estos datos aparecen en el checkout cuando el cliente elige <strong>Transferencia bancaria</strong>.</InfoBox>
          </div>
        )}

        {activeTab === "pagos" && (
          <div className="sett-section">
            <h2 className="sett-section-title">💳 Métodos de pago</h2>
            <p className="sett-section-sub">Activá o desactivá los métodos disponibles en el checkout</p>
            <Toggle
              label="💵 Efectivo"
              description="El cliente paga al recibir el pedido"
              value={bool("payment_efectivo")}
              onChange={v => setBool("payment_efectivo", v)}
            />
            <Toggle
              label="🏦 Transferencia bancaria"
              description="El cliente transfiere antes de la entrega"
              value={bool("payment_transferencia")}
              onChange={v => setBool("payment_transferencia", v)}
            />
            <Toggle
              label="💳 Mercado Pago"
              description="Tarjeta, débito o saldo de MP"
              value={bool("payment_mercadopago")}
              onChange={v => setBool("payment_mercadopago", v)}
            />
            <InfoBox>⚠️ Necesitás tener al menos 1 método activo en el checkout.</InfoBox>
          </div>
        )}

        {activeTab === "horarios" && (
          <div className="sett-section">
            <h2 className="sett-section-title">🕐 Horarios de atención</h2>
            <Field label="Lunes a Viernes" value={settings.hours_weekday}  onChange={v => set("hours_weekday", v)}  placeholder="8:00 - 12:00 / 13:00 - 18:00" />
            <Field label="Sábados"         value={settings.hours_saturday} onChange={v => set("hours_saturday", v)} placeholder="9:00 - 13:00" />
            <Field label="Domingos"        value={settings.hours_sunday}   onChange={v => set("hours_sunday", v)}   placeholder="Cerrado" />
            <InfoBox>💡 Estos horarios se usan en el footer y en los emails automáticos.</InfoBox>
          </div>
        )}

        {activeTab === "redes" && (
          <div className="sett-section">
            <h2 className="sett-section-title">📱 Redes sociales y contacto</h2>
            <Field label="Instagram (URL completa)"                     value={settings.social_instagram} onChange={v => set("social_instagram", v)} placeholder="https://www.instagram.com/usuario/" />
            <Field label="Facebook (URL completa)"                      value={settings.social_facebook}  onChange={v => set("social_facebook", v)}  placeholder="https://www.facebook.com/pagina" />
            <Field label="WhatsApp (números con código de país, sin +)" value={settings.social_whatsapp}  onChange={v => set("social_whatsapp", v)}  placeholder="541150179447" />
            <InfoBox>💡 El número de WhatsApp se usa en el botón de contacto y en mensajes de confirmación de pedidos.</InfoBox>
          </div>
        )}

        {activeTab === "textos" && (
          <div className="sett-section">
            <h2 className="sett-section-title">🎨 Textos de la tienda</h2>
            <Field label="Mensaje de bienvenida"          value={settings.store_welcome_msg} onChange={v => set("store_welcome_msg", v)} placeholder="Bienvenido a Distribuidora Osmar" />
            <Field label="Tagline / Descripción corta"    value={settings.store_tagline}     onChange={v => set("store_tagline", v)}     placeholder="Productos de limpieza mayorista desde 1983" />
            <Field label="Nota sobre precios en catálogo" value={settings.store_prices_note} onChange={v => set("store_prices_note", v)} placeholder="Los precios no incluyen IVA" />
          </div>
        )}

        {activeTab === "sistema" && (
          <div className="sett-section">
            <h2 className="sett-section-title">🔧 Estado del sistema</h2>
            <div className="sett-status-grid">
              <StatusCard label="Vercel (hosting)"      url="https://vercel.com/dashboard" />
              <StatusCard label="Neon (base de datos)"  url="https://console.neon.tech" />
              <StatusCard label="Cloudinary (imágenes)" url="https://cloudinary.com/console" />
              <StatusCard label="Resend (emails)"       url="https://resend.com/emails" />
            </div>

            <h3 className="sett-actions-title">Acciones</h3>
            <div className="sett-action-list">
              <a href="/api/health" target="_blank" rel="noopener noreferrer" className="sett-action-row">
                <span className="sett-action-icon">💓</span>
                <div className="sett-action-info">
                  <strong>Verificar estado del servidor</strong>
                  <span>Comprueba que todos los servicios responden</span>
                </div>
                <span className="sett-action-arrow">Verificar →</span>
              </a>
              <button
                type="button"
                className="sett-action-row"
                onClick={() => {
                  fetch("/api/admin/settings")
                    .then(() => alert("✅ Configuración recargada desde la base de datos"));
                }}
              >
                <span className="sett-action-icon">🔄</span>
                <div className="sett-action-info">
                  <strong>Recargar configuración</strong>
                  <span>Fuerza lectura fresca desde la base de datos</span>
                </div>
                <span className="sett-action-arrow">Ejecutar →</span>
              </button>
            </div>

            <InfoBox>
              🔒 Las credenciales sensibles (JWT_SECRET, DATABASE_URL, MP_ACCESS_TOKEN) se configuran como variables de entorno en <strong>Vercel</strong>, no desde aquí.
            </InfoBox>
          </div>
        )}

      </div>
    </div>
  );
}
