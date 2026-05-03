"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Sidebar, { type Category } from "@/components/Sidebar";
import ProductCard, { type Product } from "@/components/ProductCard";
import ProductModal from "@/components/ProductModal";
import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import QuienesSomos from "@/components/QuienesSomos";
import BrandBadges from "@/components/BrandBadges";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import SkeletonCard from "@/components/SkeletonCard";

const LIMIT = 48;
const SKELETON_COUNT = 12;

// ── Pagination helper ─────────────────────────────────────
function buildPages(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

export default function CatalogPage() {
  const [products, setProducts]             = useState<Product[]>([]);
  const [categories, setCategories]         = useState<Category[]>([]);
  const [query, setQuery]                   = useState("");
  const [activeCategory, setActiveCategory] = useState("todos");
  const [sort, setSort]                     = useState("name");
  const [page, setPage]                     = useState(1);
  const [total, setTotal]                   = useState(0);
  const [loading, setLoading]               = useState(true);
  const [cartOpen, setCartOpen]             = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetch("/api/categories")
      .then(r => r.json())
      .then(setCategories);
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      q: query,
      category: activeCategory === "todos" ? "" : activeCategory,
      sort,
      page: String(page),
      limit: String(LIMIT),
    });
    const res  = await fetch(`/api/products?${params}`);
    const data = await res.json();
    setProducts(data.products);
    setTotal(data.total);
    setLoading(false);
  }, [query, activeCategory, sort, page]);

  useEffect(() => {
    let cancelled = false;
    const delay = query ? 300 : 0;
    const timer = setTimeout(() => { if (!cancelled) fetchProducts(); }, delay);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [fetchProducts]);

  function handleQueryChange(q: string)       { setQuery(q);             setPage(1); }
  function handleCategorySelect(slug: string) { setActiveCategory(slug); setPage(1); }
  function handleSortChange(s: string)        { setSort(s);              setPage(1); }

  function handlePageChange(n: number) {
    setPage(n);
    // Smooth scroll to product grid top
    const mainEl = document.getElementById("shop-main");
    if (mainEl) {
      const top = mainEl.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }

  const totalPages  = Math.ceil(total / LIMIT);
  const activeLabel =
    activeCategory === "todos"
      ? "Todos los productos"
      : (categories.find(c => c.slug === activeCategory)?.name ?? "Productos");

  const showHero = activeCategory === "todos" && !query;

  // Pagination range info
  const firstItem = (page - 1) * LIMIT + 1;
  const lastItem  = Math.min(page * LIMIT, total);

  return (
    <>
      <Header
        query={query}
        onQueryChange={handleQueryChange}
        onCartOpen={() => setCartOpen(true)}
        onMenuToggle={() => setMobileMenuOpen(v => !v)}
        onCategorySelect={handleCategorySelect}
      />

      {showHero && (
        <>
          <div style={{ marginTop: "var(--header-h)" }}>
            <Hero
              onExplore={() => {
                document.querySelector("main.site-main")?.scrollIntoView({ behavior: "smooth" });
              }}
              totalProducts={total || undefined}
            />
          </div>
          <BrandBadges />
          <QuienesSomos />
        </>
      )}

      <div className="layout" style={showHero ? { marginTop: 0 } : undefined}>
        <Sidebar
          categories={categories}
          active={activeCategory}
          onSelect={handleCategorySelect}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />

        <main className="site-main" id="shop-main">
          <div className="main-header">
            <h2>{activeLabel}</h2>
            {!loading && <span className="result-count">{total} productos</span>}
            <select
              className="sort-select"
              value={sort}
              onChange={e => handleSortChange(e.target.value)}
            >
              <option value="name">Nombre A-Z</option>
              <option value="price_asc">Precio ↑</option>
              <option value="price_desc">Precio ↓</option>
            </select>
          </div>

          {loading ? (
            /* ── Skeleton grid ── */
            <div className="products-grid">
              {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            /* ── Empty state ── */
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3 className="empty-title">
                {query ? `Sin resultados para "${query}"` : "No hay productos en esta categoría"}
              </h3>
              <p className="empty-sub">
                {query
                  ? "Probá con otro término, revisá el código o explorá por categoría."
                  : "Seleccioná otra categoría o buscá por nombre."}
              </p>
              <div className="empty-actions">
                {query && (
                  <button className="empty-btn" onClick={() => handleQueryChange("")}>
                    Limpiar búsqueda
                  </button>
                )}
                {activeCategory !== "todos" && (
                  <button className="empty-btn empty-btn--ghost" onClick={() => handleCategorySelect("todos")}>
                    Ver todos los productos
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="products-grid">
                {products.map(p => (
                  <ProductCard key={p.id} product={p} onExpand={setSelectedProduct} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="pagination-wrap">
                  <p className="pagination-info">
                    Mostrando {firstItem}–{lastItem} de {total} productos
                  </p>
                  <div className="pagination">
                    <button
                      className="page-btn page-btn--arrow"
                      disabled={page === 1}
                      onClick={() => handlePageChange(page - 1)}
                      aria-label="Página anterior"
                    >
                      ← Anterior
                    </button>

                    {buildPages(page, totalPages).map((n, i) =>
                      n === "…" ? (
                        <span key={`ellipsis-${i}`} className="page-ellipsis">…</span>
                      ) : (
                        <button
                          key={n}
                          className={`page-btn${page === n ? " active" : ""}`}
                          onClick={() => handlePageChange(n)}
                        >
                          {n}
                        </button>
                      )
                    )}

                    <button
                      className="page-btn page-btn--arrow"
                      disabled={page === totalPages}
                      onClick={() => handlePageChange(page + 1)}
                      aria-label="Página siguiente"
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          <Footer />
        </main>
      </div>

      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <WhatsAppFloat />
    </>
  );
}
