"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useCart } from "@/lib/cart";
import AuthModal from "./AuthModal";

type User = { name: string; email: string; role: string } | null;

type Props = {
  query: string;
  onQueryChange: (q: string) => void;
  onCartOpen: () => void;
};

export default function Header({ query, onQueryChange, onCartOpen }: Props) {
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
        <Link href="/" className="logo">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M9.5 3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1h2.5A1.5 1.5 0 0 1 18.5 5.5v13A1.5 1.5 0 0 1 17 20H7a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 7 4H9.5V3ZM7 6v12h10V6H7Zm3-1v-1h4v1H10Zm-1 5a1 1 0 0 1 1-1h4a1 1 0 0 1 0 2h-4a1 1 0 0 1-1-1Zm0 3a1 1 0 0 1 1-1h4a1 1 0 0 1 0 2h-4a1 1 0 0 1-1-1Z" />
            </svg>
          </div>
          <div>
            <div className="logo-name">Osmar</div>
            <div className="logo-sub">Distribuidora</div>
          </div>
        </Link>

        <div className="search-wrap">
          <span className="search-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              <span className="user-name">👤 {user.name.split(" ")[0]}</span>
              <button className="btn-logout" onClick={handleLogout}>Salir</button>
            </div>
          ) : (
            <button className="btn-login" onClick={() => setAuthOpen(true)}>
              Iniciar sesión
            </button>
          )}
          <button className="btn-cart" onClick={onCartOpen}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            Carrito
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
