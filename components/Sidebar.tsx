"use client";

import { useState, useEffect } from "react";

export type Category = {
  id: number;
  name: string;
  slug: string;
  emoji: string;
  _count: { products: number };
};

// ── Dual-range price slider ────────────────────────────────
const PRICE_MIN = 0;
export const PRICE_MAX = 50000;

function PriceSlider({
  valueMin, valueMax, onChange,
}: {
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
}) {
  const [localMin, setLocalMin] = useState(valueMin);
  const [localMax, setLocalMax] = useState(valueMax);

  // Sync when parent clears filters
  useEffect(() => { setLocalMin(valueMin); }, [valueMin]);
  useEffect(() => { setLocalMax(valueMax); }, [valueMax]);

  const pct = (v: number) =>
    ((v - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;

  function commitChange(min = localMin, max = localMax) {
    onChange(min, max);
  }

  function fmt(n: number) {
    return n >= 1000
      ? `$${(n / 1000).toFixed(0)}k`
      : `$${n.toLocaleString("es-AR")}`;
  }

  return (
    <div className="price-slider">
      {/* Track + fill */}
      <div className="price-slider-track">
        <div
          className="price-slider-fill"
          style={{ left: `${pct(localMin)}%`, right: `${100 - pct(localMax)}%` }}
        />
      </div>

      {/* Two stacked range inputs */}
      <div className="price-range-wrap">
        <input
          type="range"
          className="price-range-in"
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={500}
          value={localMin}
          onChange={e => {
            const v = Math.min(Number(e.target.value), localMax - 500);
            setLocalMin(v);
          }}
          onMouseUp={() => commitChange()}
          onTouchEnd={() => commitChange()}
        />
        <input
          type="range"
          className="price-range-in"
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={500}
          value={localMax}
          onChange={e => {
            const v = Math.max(Number(e.target.value), localMin + 500);
            setLocalMax(v);
          }}
          onMouseUp={() => commitChange()}
          onTouchEnd={() => commitChange()}
        />
      </div>

      {/* Labels */}
      <div className="price-range-labels">
        <span>{fmt(localMin)}</span>
        <span>{fmt(localMax)}</span>
      </div>
    </div>
  );
}

// ── Main Sidebar ───────────────────────────────────────────
type Props = {
  categories: Category[];
  active: string;
  onSelect: (slug: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  /* Filters */
  filterPriceMin: number;
  filterPriceMax: number;
  onPriceChange: (min: number, max: number) => void;
  filterInStock: boolean;
  onInStockChange: (v: boolean) => void;
  hasFilters: boolean;
  onClearFilters: () => void;
};

export default function Sidebar({
  categories, active, onSelect, mobileOpen, onMobileClose,
  filterPriceMin, filterPriceMax, onPriceChange,
  filterInStock, onInStockChange,
  hasFilters, onClearFilters,
}: Props) {
  const visibleCats = categories.filter(c => c.slug !== "todos" && c._count.products > 0);
  const allCount    = visibleCats.reduce((s, c) => s + c._count.products, 0);

  function handleSelect(slug: string) {
    onSelect(slug);
    onMobileClose?.();
  }

  return (
    <>
      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={onMobileClose} aria-hidden="true" />
      )}

      <aside className={`site-sidebar${mobileOpen ? " mobile-open" : ""}`}>
        {/* Mobile close */}
        <div className="sidebar-mobile-head">
          <span className="side-title" style={{ marginBottom: 0 }}>Categorías</span>
          <button className="sidebar-close-btn" onClick={onMobileClose} aria-label="Cerrar menú">✕</button>
        </div>

        {/* ── Categories ── */}
        <div className="side-title side-title--desktop">Categorías</div>

        <button
          className={`cat-btn${active === "todos" ? " active" : ""}`}
          onClick={() => handleSelect("todos")}
        >
          <span className="cat-icon">🏠</span>
          Todos
          <span className="cat-count">{allCount}</span>
        </button>

        {visibleCats.map(cat => (
          <button
            key={cat.id}
            className={`cat-btn${active === cat.slug ? " active" : ""}`}
            onClick={() => handleSelect(cat.slug)}
          >
            <span className="cat-icon">{cat.emoji}</span>
            {cat.name}
            <span className="cat-count">{cat._count.products}</span>
          </button>
        ))}

        {/* ── Filters divider ── */}
        <div className="sidebar-divider" />

        {/* ── Filters header ── */}
        <div className="side-filters-head">
          <span className="side-title" style={{ marginBottom: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ marginRight: 5, verticalAlign: "middle" }}>
              <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
              <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
              <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/>
              <line x1="17" y1="16" x2="23" y2="16"/>
            </svg>
            Filtros
          </span>
          {hasFilters && (
            <button className="filter-clear-btn" onClick={onClearFilters}>
              Limpiar
            </button>
          )}
        </div>

        {/* ── Price range ── */}
        <div className="filter-section">
          <p className="filter-label">Rango de precio</p>
          <PriceSlider
            valueMin={filterPriceMin}
            valueMax={filterPriceMax}
            onChange={onPriceChange}
          />
        </div>

        {/* ── Stock filter ── */}
        <div className="filter-section">
          <label className="filter-check-label">
            <input
              type="checkbox"
              checked={filterInStock}
              onChange={e => onInStockChange(e.target.checked)}
              className="filter-check"
            />
            <span>Solo con stock</span>
          </label>
        </div>

      </aside>
    </>
  );
}
