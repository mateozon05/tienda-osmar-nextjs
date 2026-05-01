"use client";

import { useState } from "react";

interface HeroProps {
  onExplore: () => void;
}

export default function Hero({ onExplore }: HeroProps) {
  const [logoError, setLogoError] = useState(false);

  return (
    <section className="hero">
      <div className="hero-inner">
        {!logoError ? (
          <img
            src="/logo-osmar.jpg"
            alt="Distribuidora Osmar"
            className="hero-logo"
            onError={() => setLogoError(true)}
          />
        ) : (
          <div style={{
            width: 96, height: 96, borderRadius: 20,
            background: "rgba(255,255,255,.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px", fontSize: 48,
            border: "3px solid rgba(255,255,255,.4)",
          }}>
            🏪
          </div>
        )}

        <h1 className="hero-title">Distribuidora Osmar</h1>
        <p className="hero-sub">
          Artículos de limpieza e higiene para empresas, comercios e instituciones.<br />
          Zona norte del Gran Buenos Aires.
        </p>

        <button className="hero-cta" onClick={onExplore}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          Explorar catálogo
        </button>
      </div>
    </section>
  );
}
