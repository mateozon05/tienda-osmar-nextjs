"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/lib/cart";
import AuthModal from "./AuthModal";
import Logo from "./Logo";

type User = { name: string; email: string; role: string } | null;

type Props = {
  query: string;
  onQueryChange: (q: string) => void;
  onCartOpen: () => void;
  onMenuToggle?: () => void;
};

export default function Header({ query, onQueryChange, onCartOpen, onMenuToggle }: Props) {
  const { count } = useCart();
  const [user, setUser] = useState<User>(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setUser(data.user))
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

  return (
    <>
      <header className="site-header">
        {/* Hamburger — only visible on mobile */}
        {onMenuToggle && (
          <button
            className="btn-hamburger"
            onClick={onMenuToggle}
            aria-label="Abrir menú de categorías"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="5" x2="18" y2="5" />
              <line x1="2" y1="10" x2="18" y2="10" />
              <line x1="2" y1="15" x2="18" y2="15" />
            </svg>
          </button>
        )}

        <Logo />

        <div className="search-wrap">
          <span className="search-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Buscar productos, códigos..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="header-actions">
          {user ? (
            <div className="user-menu">
              <span className="user-name">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4, verticalAlign: "middle" }}>
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
                {user.name.split(" ")[0]}
              </span>
              <button className="btn-logout" onClick={handleLogout}>Salir</button>
            </div>
          ) : (
            <button className="btn-login" onClick={() => setAuthOpen(true)}>
              Ingresar
            </button>
          )}

          <button className="btn-cart" onClick={onCartOpen} aria-label="Ver carrito">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span className="btn-cart-label">Carrito</span>
            {count > 0 && <span className="cart-badge">{count}</span>}
          </button>
        </div>
      </header>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(u) => setUser(u)}
      />
    </>
  );
}
