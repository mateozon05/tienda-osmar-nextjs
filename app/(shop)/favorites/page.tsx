"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import ProductCard, { type Product } from "@/components/ProductCard";
import ProductModal from "@/components/ProductModal";
import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { useFavorites } from "@/lib/favorites";

export default function FavoritesPage() {
  const { favorites, count, clear } = useFavorites();
  const [query, setQuery]             = useState("");
  const [cartOpen, setCartOpen]       = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Local search within favorites
  const filtered = query
    ? favorites.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.code.toLowerCase().includes(query.toLowerCase())
      )
    : favorites;

  return (
    <>
      <Header
        query={query}
        onQueryChange={setQuery}
        onCartOpen={() => setCartOpen(true)}
      />

      <div className="fav-page" style={{ marginTop: "var(--header-h)" }}>
        {/* ── Page header ── */}
        <div className="fav-page-header">
          <div className="fav-page-title-row">
            <span className="fav-page-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </span>
            <div>
              <h1 className="fav-page-title">Mis Favoritos</h1>
              <p className="fav-page-sub">
                {count === 0
                  ? "Todavía no guardaste ningún producto"
                  : `${count} producto${count === 1 ? "" : "s"} guardado${count === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>

          <div className="fav-page-actions">
            <Link href="/" className="fav-back-btn">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M19 12H5m7-7-7 7 7 7"/>
              </svg>
              Ver catálogo
            </Link>
            {count > 0 && (
              <button className="fav-clear-btn" onClick={clear}>
                Limpiar todos
              </button>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        {count === 0 ? (
          /* Empty state */
          <div className="fav-empty">
            <div className="fav-empty-icon">💔</div>
            <h2 className="fav-empty-title">Todavía no tenés favoritos</h2>
            <p className="fav-empty-sub">
              Explorá el catálogo y hacé click en el corazón ❤️ de los productos que te interesen.
            </p>
            <Link href="/" className="fav-empty-cta">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              Explorar productos
            </Link>
          </div>
        ) : (
          <div className="fav-grid-wrap">
            {/* Filtered results info */}
            {query && (
              <p className="fav-filter-info">
                {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} para &ldquo;{query}&rdquo;
                {filtered.length === 0 && (
                  <button className="fav-filter-clear" onClick={() => setQuery("")}>
                    Limpiar
                  </button>
                )}
              </p>
            )}

            {filtered.length > 0 ? (
              <div className="products-grid">
                {filtered.map(p => (
                  <ProductCard key={p.id} product={p} onExpand={setSelectedProduct} />
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ paddingTop: 40 }}>
                <div className="empty-icon">🔍</div>
                <h3 className="empty-title">Sin resultados en favoritos</h3>
                <p className="empty-sub">Ningún favorito coincide con &ldquo;{query}&rdquo;</p>
                <button className="empty-btn" onClick={() => setQuery("")}>Limpiar búsqueda</button>
              </div>
            )}
          </div>
        )}

        <Footer />
      </div>

      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <WhatsAppFloat />
    </>
  );
}
