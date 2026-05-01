"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Sidebar, { type Category } from "@/components/Sidebar";
import ProductCard, { type Product } from "@/components/ProductCard";
import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import QuienesSomos from "@/components/QuienesSomos";
import BrandBadges from "@/components/BrandBadges";
import WhatsAppFloat from "@/components/WhatsAppFloat";

const LIMIT = 40;

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("todos");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
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
    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    setProducts(data.products);
    setTotal(data.total);
    setLoading(false);
  }, [query, activeCategory, sort, page]);

  useEffect(() => {
    let cancelled = false;
    const delay = query ? 300 : 0;
    const timer = setTimeout(() => {
      if (!cancelled) fetchProducts();
    }, delay);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [fetchProducts]);

  function handleQueryChange(q: string) { setQuery(q); setPage(1); }
  function handleCategorySelect(slug: string) { setActiveCategory(slug); setPage(1); }
  function handleSortChange(s: string) { setSort(s); setPage(1); }

  const totalPages = Math.ceil(total / LIMIT);
  const activeLabel =
    activeCategory === "todos"
      ? "Todos los productos"
      : (categories.find((c) => c.slug === activeCategory)?.name ?? "Productos");

  const showHero = activeCategory === "todos" && !query;

  return (
    <>
      <Header
        query={query}
        onQueryChange={handleQueryChange}
        onCartOpen={() => setCartOpen(true)}
        onMenuToggle={() => setMobileMenuOpen((v) => !v)}
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
          {/* Fase 5: Brands ticker */}
          <BrandBadges />
          {/* Fase 2: Quiénes somos */}
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

        <main className="site-main">
          <div className="main-header">
            <h2>{activeLabel}</h2>
            {!loading && <span className="result-count">{total} productos</span>}
            <select
              className="sort-select"
              value={sort}
              onChange={(e) => handleSortChange(e.target.value)}
            >
              <option value="name">Nombre A-Z</option>
              <option value="price_asc">Precio ↑</option>
              <option value="price_desc">Precio ↓</option>
            </select>
          </div>

          {loading ? (
            <div className="no-results">
              <div className="emoji">⏳</div>
              <h3>Cargando productos...</h3>
            </div>
          ) : products.length === 0 ? (
            <div className="no-results">
              <div className="emoji">🔍</div>
              <h3>Sin resultados para &ldquo;{query}&rdquo;</h3>
              <p>Probá con otro término o revisá el código del producto</p>
            </div>
          ) : (
            <>
              <div className="products-grid">
                {products.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button className="page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>←</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      className={`page-btn${page === n ? " active" : ""}`}
                      onClick={() => setPage(n)}
                    >{n}</button>
                  ))}
                  <button className="page-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>→</button>
                </div>
              )}
            </>
          )}

          <Footer />
        </main>
      </div>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      {/* Fase 3: WhatsApp flotante */}
      <WhatsAppFloat />
    </>
  );
}
