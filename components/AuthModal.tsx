"use client";

import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: { name: string; email: string; role: string }) => void;
};

export default function AuthModal({ open, onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", company: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const url = tab === "login" ? "/api/auth/login" : "/api/auth/register";
    const body = tab === "login"
      ? { email: form.email, password: form.password }
      : { email: form.email, password: form.password, name: form.name, company: form.company || undefined };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Error inesperado");
      return;
    }

    if (tab === "register") {
      setRegistered(true);
      return;
    }

    onSuccess(data.user);
    onClose();
  }

  if (!open) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal">
        <div className="modal-head">
          <div className="modal-tabs">
            <button
              className={`modal-tab${tab === "login" ? " active" : ""}`}
              onClick={() => { setTab("login"); setError(""); setRegistered(false); }}
            >
              Iniciar sesión
            </button>
            <button
              className={`modal-tab${tab === "register" ? " active" : ""}`}
              onClick={() => { setTab("register"); setError(""); setRegistered(false); }}
            >
              Registrarse
            </button>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {registered ? (
          <div className="auth-pending-wrap">
            <div className="auth-pending-icon">⏳</div>
            <h3 className="auth-pending-title">¡Registro exitoso!</h3>
            <p className="auth-pending-msg">
              Tu cuenta fue creada y está <strong>pendiente de aprobación</strong>.
              Una vez que el administrador la apruebe, podrás iniciar sesión y ver los precios personalizados.
            </p>
            <button className="btn-pay" onClick={() => { setRegistered(false); setTab("login"); }}>
              Ir a iniciar sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form">
            {tab === "register" && (
              <>
                <div className="form-group">
                  <label>Nombre completo *</label>
                  <input required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Juan García" />
                </div>
                <div className="form-group">
                  <label>Empresa / Negocio</label>
                  <input value={form.company} onChange={(e) => update("company", e.target.value)} placeholder="Nombre de tu empresa (opcional)" />
                </div>
              </>
            )}
            <div className="form-group">
              <label>Email *</label>
              <input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="juan@ejemplo.com" />
            </div>
            <div className="form-group">
              <label>Contraseña *</label>
              <input required type="password" value={form.password} onChange={(e) => update("password", e.target.value)} placeholder={tab === "register" ? "Mínimo 6 caracteres" : "Tu contraseña"} />
            </div>

            {error && <div className="checkout-error">⚠️ {error}</div>}

            <button type="submit" className="btn-pay" disabled={loading}>
              {loading ? "Procesando..." : tab === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
