"use client";

import { useState, useEffect } from "react";

type Settings = {
  store_name: string;
  store_phone: string;
  store_email: string;
  store_address: string;
  store_hours: string;
  store_whatsapp: string;
  mp_dashboard_url: string;
};

const DEFAULT_SETTINGS: Settings = {
  store_name: "",
  store_phone: "",
  store_email: "",
  store_address: "",
  store_hours: "",
  store_whatsapp: "",
  mp_dashboard_url: "",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
        setLoading(false);
      })
      .catch(() => { setError("Error cargando configuración"); setLoading(false); });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError("Error guardando cambios");
    }
    setSaving(false);
  }

  function Field({
    label, field, type = "text", placeholder = "",
  }: {
    label: string; field: keyof Settings; type?: string; placeholder?: string;
  }) {
    return (
      <div className="settings-field">
        <label className="settings-label">{label}</label>
        <input
          className="settings-input"
          type={type}
          value={settings[field]}
          placeholder={placeholder}
          onChange={(e) => setSettings((s) => ({ ...s, [field]: e.target.value }))}
        />
      </div>
    );
  }

  if (loading) return <div className="admin-page"><div className="admin-loading">Cargando configuración...</div></div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">Configuración</h1>
      </div>

      <form onSubmit={handleSave} style={{ maxWidth: 680 }}>

        {/* Store info */}
        <div className="admin-card" style={{ marginBottom: 16 }}>
          <h3 className="admin-card-title">Información de la tienda</h3>
          <div className="settings-grid">
            <Field label="Nombre de la tienda" field="store_name" placeholder="Distribuidora Osmar" />
            <Field label="Teléfono" field="store_phone" type="tel" placeholder="+54 11 1234-5678" />
            <Field label="Email de contacto" field="store_email" type="email" placeholder="osmar@ejemplo.com" />
            <Field label="Dirección" field="store_address" placeholder="Tigre, Buenos Aires" />
            <Field label="Horario de atención" field="store_hours" placeholder="Lunes a Viernes 9:00–18:00" />
          </div>
        </div>

        {/* WhatsApp */}
        <div className="admin-card" style={{ marginBottom: 16 }}>
          <h3 className="admin-card-title">WhatsApp</h3>
          <div className="settings-grid">
            <Field label="Número de WhatsApp" field="store_whatsapp" type="tel" placeholder="5491112345678" />
          </div>
          <p className="settings-hint">
            Ingresá el número en formato internacional sin +, por ejemplo: 5491112345678
          </p>
        </div>

        {/* Mercado Pago */}
        <div className="admin-card" style={{ marginBottom: 24 }}>
          <h3 className="admin-card-title">Mercado Pago</h3>
          <div className="settings-grid">
            <Field label="URL del panel MP" field="mp_dashboard_url" type="url" placeholder="https://www.mercadopago.com.ar/activities" />
          </div>
          <p className="settings-hint">
            Link directo a tu panel de actividades en Mercado Pago para revisar cobros.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="submit" className="btn-save-settings" disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          {saved && <span className="settings-saved">✅ Cambios guardados</span>}
          {error && <span className="settings-error">⚠️ {error}</span>}
        </div>
      </form>
    </div>
  );
}
