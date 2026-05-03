"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { useFavorites } from "@/lib/favorites";
import AuthModal from "./AuthModal";
import Logo from "./Logo";

type User = { name: string; email: string; role: string } | null;

type SearchSuggestion = {
  products: Array<{
    id: number; name: string; code: string; price: number;
    unitPrice: number | null;
    category: { name: string; emoji: string; slug: string } | null;
  }>;
  categories: Array<{
    id: number; name: string; slug: string; emoji: string;
    _count: { products: number };
  }>;
};

type Props = {
  query: string;
  onQueryChange: (q: string) => void;
  onCartOpen: () => void;
  onMenuToggle?: () => void;
  onCategorySelect?: (slug: string) => void;
};

const RECENT_KEY = "osmar-searches";
const MAX_RECENT = 5;

function saveSearch(q: string) {
  if (q.trim().length < 2) return;
  try {
    const saved: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    const updated = [q.trim(), ...saved.filter(s => s !== q.trim())].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch {}
}

function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; }
}

function dropRecent(q: string) {
  try {
    const saved: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    localStorage.setItem(RECENT_KEY, JSON.stringify(saved.filter(s => s !== q)));
  } catch {}
}

export default function Header({
  query, onQueryChange, onCartOpen, onMenuToggle, onCategorySelect,
}: Props) {
  const { count } = useCart();
  const { count: favCount } = useFavorites();
  const [user, setUser] = useState<User>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [focused, setFocused]   = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion>({ products: [], categories: [] });
  const [recents, setRecents]   = useState<string[]>([]);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setUser(d.user))
      .catch(() => {});
  }, []);

  // Debounced autocomplete
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.length < 2) { setSuggestions({ products: [], categories: [] }); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
        if (r.ok) setSuggestions(await r.json());
      } catch {}
    }, 220);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setFocused(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleFocus() {
    setFocused(true);
    setRecents(loadRecent());
  }

  function handleSelectProduct(name: string) {
    saveSearch(name);
    onQueryChange(name);
    setFocused(false);
  }

  function handleSelectCategory(slug: string, name: string) {
    saveSearch(name);
    onCategorySelect?.(slug);
    onQueryChange("");
    setFocused(false);
  }

  function handleSelectRecent(q: string) {
    onQueryChange(q);
    setFocused(false);
  }

  function handleRemoveRecent(q: string, e: React.MouseEvent) {
    e.stopPropagation();
    dropRecent(q);
    setRecents(loadRecent());
  }

  function handleClear() {
    onQueryChange("");
    setSuggestions({ products: [], categories: [] });
    setFocused(false);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

  const hasSuggestions = suggestions.products.length > 0 || suggestions.categories.length > 0;
  const showDropdown = focused && (
    (query.length >= 2 && hasSuggestions) ||
    (query.length === 0 && recents.length > 0)
  );

  return (
    <>
      <header className="site-header">
        {onMenuToggle && (
          <button className="btn-hamburger" onClick={onMenuToggle} aria-label="Abrir menú de categorías">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="5" x2="18" y2="5"/>
              <line x1="2" y1="10" x2="18" y2="10"/>
              <line x1="2" y1="15" x2="18" y2="15"/>
            </svg>
          </button>
        )}

        <Logo />

        {/* ── Search ── */}
        <div className="search-wrap" ref={wrapRef}>
          <span className="search-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </span>

          <input
            type="text"
            placeholder="Buscar productos, códigos..."
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            onFocus={handleFocus}
            autoComplete="off"
            className={query ? "search-input--has-clear" : ""}
          />

          {query && (
            <button className="search-clear" onClick={handleClear} aria-label="Limpiar búsqueda">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}

          {/* ── Autocomplete dropdown ── */}
          {showDropdown && (
            <div className="search-dropdown">

              {/* Recent searches */}
              {query.length === 0 && recents.length > 0 && (
                <div className="sd-section">
                  <p className="sd-label">Búsquedas recientes</p>
                  {recents.map(s => (
                    <button key={s} className="sd-item" onClick={() => handleSelectRecent(s)}>
                      <span className="sd-icon">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                          <polyline points="1,4 1,10 7,10"/>
                          <path d="M3.51 15a9 9 0 1 0 .49-4.97"/>
                        </svg>
                      </span>
                      <span className="sd-text">{s}</span>
                      <button
                        className="sd-remove"
                        onClick={e => handleRemoveRecent(s, e)}
                        aria-label={`Eliminar "${s}"`}
                      >×</button>
                    </button>
                  ))}
                </div>
              )}

              {/* Category hits */}
              {suggestions.categories.length > 0 && (
                <div className="sd-section">
                  <p className="sd-label">Categorías</p>
                  {suggestions.categories.map(c => (
                    <button key={c.slug} className="sd-item" onClick={() => handleSelectCategory(c.slug, c.name)}>
                      <span className="sd-icon sd-icon--emoji">{c.emoji}</span>
                      <span className="sd-text">{c.name}</span>
                      <span className="sd-meta">{c._count.products} productos</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Product hits */}
              {suggestions.products.length > 0 && (
                <div className="sd-section">
                  <p className="sd-label">Productos</p>
                  {suggestions.products.map(p => (
                    <button key={p.id} className="sd-item" onClick={() => handleSelectProduct(p.name)}>
                      <span className="sd-icon sd-icon--emoji">{p.category?.emoji ?? "📦"}</span>
                      <span className="sd-text">
                        {p.name}
                        <span className="sd-code"> · {p.code}</span>
                      </span>
                      <span className="sd-meta">
                        ${(p.unitPrice ?? p.price).toLocaleString("es-AR", { minimumFractionDigits: 0 })}
                      </span>
                    </button>
                  ))}
                </div>
              )}

            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="header-actions">
          {/* Favorites link */}
          <Link href="/favorites" className="btn-fav-link" aria-label="Mis favoritos">
            <svg width="17" height="17" viewBox="0 0 24 24" fill={favCount > 0 ? "currentColor" : "none"}
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            {favCount > 0 && <span className="fav-header-badge">{favCount}</span>}
          </Link>
          {user ? (
            <div className="user-menu">
              <span className="user-name">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4, verticalAlign: "middle" }}>
                  <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
                {user.name.split(" ")[0]}
              </span>
              <button className="btn-logout" onClick={handleLogout}>Salir</button>
            </div>
          ) : (
            <button className="btn-login" onClick={() => setAuthOpen(true)}>Ingresar</button>
          )}

          <button className="btn-cart" onClick={onCartOpen} aria-label="Ver carrito">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <span className="btn-cart-label">Carrito</span>
            {count > 0 && <span className="cart-badge">{count}</span>}
          </button>
        </div>
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={u => setUser(u)} />
    </>
  );
}
