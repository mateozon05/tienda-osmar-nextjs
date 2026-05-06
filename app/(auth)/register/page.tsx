"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [name,     setName]     = useState("");
  const [company,  setCompany]  = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);

  async function handleRegister(e?: React.FormEvent) {
    e?.preventDefault();
    if (!name || !email || !password) { setError("Completá los campos obligatorios"); return; }
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
    setLoading(true);
    setError("");

    const res  = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, company, email, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error); return; }

    setDone(true);
  }

  if (done) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="auth-logo-wrap">
              <img src="/logo-osmar.png" alt="Osmar" className="auth-logo-img" />
            </div>
            <div>
              <div className="auth-brand-name">OSMAR</div>
              <div className="auth-brand-sub">Distribuidora de Limpieza</div>
            </div>
          </div>

          <div className="auth-pending-wrap">
            <div className="auth-pending-icon">⏳</div>
            <h2 className="auth-pending-title">¡Cuenta creada!</h2>
            <p className="auth-pending-msg">
              Tu solicitud está <strong>pendiente de aprobación</strong> por el administrador.
              Te avisaremos cuando tu cuenta esté activa.
            </p>
            <Link href="/login" className="auth-btn" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: "20px" }}>
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">

        {/* Logo */}
        <div className="auth-brand">
          <div className="auth-logo-wrap">
            <img src="/logo-osmar.png" alt="Osmar" className="auth-logo-img" />
          </div>
          <div>
            <div className="auth-brand-name">OSMAR</div>
            <div className="auth-brand-sub">Distribuidora de Limpieza</div>
          </div>
        </div>

        <h2 className="auth-title">Crear cuenta</h2>
        <p className="auth-subtitle">Tu cuenta quedará pendiente de aprobación</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleRegister} noValidate>
          <div className="auth-field">
            <label className="auth-label">Nombre <span className="auth-required">*</span></label>
            <input
              type="text"
              className="auth-input"
              placeholder="Tu nombre completo"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Empresa <span className="auth-optional">(opcional)</span></label>
            <input
              type="text"
              className="auth-input"
              placeholder="Nombre de tu empresa"
              value={company}
              onChange={e => setCompany(e.target.value)}
              autoComplete="organization"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Email <span className="auth-required">*</span></label>
            <input
              type="email"
              className="auth-input"
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Contraseña <span className="auth-required">*</span></label>
            <input
              type="password"
              className="auth-input"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Creando cuenta…" : "Crear cuenta"}
          </button>
        </form>

        <p className="auth-switch">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="auth-link">Ingresá</Link>
        </p>
      </div>
    </div>
  );
}
