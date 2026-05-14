"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password,   setPassword]   = useState("");
  const [error,      setError]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const router = useRouter();

  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault();
    if (!identifier || !password) { setError("Completá todos los campos"); return; }
    setLoading(true);
    setError("");

    const res  = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error); return; }

    // Redirect based on role
    if (data.user?.role === "admin" || data.user?.role === "superadmin") {
      router.push("/dashboard");
    } else {
      router.push("/");
    }
    router.refresh();
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

        <h2 className="auth-title">Bienvenido</h2>
        <p className="auth-subtitle">Ingresá con tu email o número de cliente</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleLogin} noValidate>
          <div className="auth-field">
            <label className="auth-label">Email o número de cliente</label>
            <input
              type="text"
              className="auth-input"
              placeholder="Email o número de cliente (ej: 1254)"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Contraseña</label>
            <input
              type="password"
              className="auth-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <p className="auth-switch">
          ¿No tenés cuenta?{" "}
          <Link href="/register" className="auth-link">Registrate</Link>
        </p>
      </div>
    </div>
  );
}
