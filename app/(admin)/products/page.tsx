"use client";

import { useState, useEffect, useCallback } from "react";

type AdminProduct = {
  id: number;
  code: string;
  name: string;
  price: number;
  active: boolean;
  bulkUnit: string | null;
  bulkSize: number | null;
  bulkPrice: number | null;
  unitPrice: number | null;
  category: { name: string; slug: string; emoji: string } | null;
};

type RowState = {
  bulkUnit: string;
  bulkSize: string;
  bulkPrice: string;
  unitPrice: string;
  dirty: boolean;
  saving: boolean;
  saved: boolean;
};

function initRow(p: AdminProduct): RowState {
  return {
    bulkUnit:  p.bulkUnit  ?? "",
    bulkSize:  p.bulkSize  != null ? String(p.bulkSize)  : "",
    bulkPrice: p.bulkPrice != null ? String(p.bulkPrice) : "",
    unitPrice: p.unitPrice != null ? String(p.unitPrice) : "",
    dirty: false, saving: false, saved: false,
  };
}

export default function AdminProductsPage() {
  const [products, setProducts]   = useState<AdminProduct[]>([]);
  const [rows, setRows]           = useState<Record<number, RowState>>({});
  const [categories, setCategories] = useState<{name:string;slug:string}[]>([]);
  const [q, setQ]                 = useState("");
  const [category, setCategory]   = useState("");
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const LIMIT = 50;

  // Cargar categorías
  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(setCategories);
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ q, category, page: String(page), limit: String(LIMIT) });
    const res = await fetch(`/api/admin/products?${params}`);
    const data = await res.json();
    setProducts(data.products);
    setTotal(data.total);
    setRows(Object.fromEntries(data.products.map((p: AdminProduct) => [p.id, initRow(p)])));
    setLoading(false);
  }, [q, category, page]);

  useEffect(() => {
    const t = setTimeout(fetchProducts, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchProducts]);

  function updateRow(id: number, field: keyof RowState, value: string) {
    setRows(prev => {
      const row = { ...prev[id], [field]: value, dirty: true, saved: false };

      // Auto-calcular unitPrice cuando se escribe bulkPrice + bulkSize
      if (field === "bulkSize" || field === "bulkPrice") {
        const bp = field === "bulkPrice" ? parseFloat(value) : parseFloat(row.bulkPrice);
        const bs = field === "bulkSize"  ? parseInt(value)   : parseInt(row.bulkSize);
        if (bp > 0 && bs > 1) {
          row.unitPrice = (bp / bs).toFixed(2);
        }
      }
      return { ...prev, [id]: row };
    });
  }

  // Autocompletar bulkPrice con price del producto
  function fillBulkPrice(p: AdminProduct) {
    setRows(prev => ({
      ...prev,
      [p.id]: { ...prev[p.id], bulkPrice: String(p.price), dirty: true, saved: false },
    }));
  }

  async function saveRow(id: number) {
    const row = rows[id];
    setRows(prev => ({ ...prev, [id]: { ...prev[id], saving: true } }));
    await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bulkUnit:  row.bulkUnit  || null,
        bulkSize:  row.bulkSize  || null,
        bulkPrice: row.bulkPrice || null,
        unitPrice: row.unitPrice || null,
      }),
    });
    setRows(prev => ({ ...prev, [id]: { ...prev[id], saving: false, dirty: false, saved: true } }));
    setTimeout(() => setRows(prev => ({ ...prev, [id]: { ...prev[id], saved: false } })), 2000);
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="admin-products-page">
      <div className="ap-header">
        <div>
          <h1 className="ap-title">Productos</h1>
          <p className="ap-sub">Configurá precio bulto/unidad para habilitar el selector en la tienda</p>
        </div>
        <span className="ap-count">{total} productos</span>
      </div>

      {/* Filtros */}
      <div className="ap-filters">
        <input
          className="ap-search"
          placeholder="Buscar por nombre o código…"
          value={q}
          onChange={e => { setQ(e.target.value); setPage(1); }}
        />
        <select
          className="ap-select"
          value={category}
          onChange={e => { setCategory(e.target.value); setPage(1); }}
        >
          <option value="">Todas las categorías</option>
          {categories.map(c => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Leyenda */}
      <div className="ap-legend">
        <span className="ap-legend-chip ap-legend-chip--auto">auto-calculado</span>
        <span className="ap-legend-text">
          Completá <strong>Tipo de bulto</strong> + <strong>Cant. unidades</strong> + <strong>Precio bulto</strong> → el precio unitario se calcula solo.
        </span>
      </div>

      {loading ? (
        <div className="ap-loading">Cargando productos…</div>
      ) : (
        <>
          <div className="ap-table-wrap">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="ap-th-sm">Cód</th>
                  <th className="ap-th-price">Precio lista</th>
                  <th className="ap-th-field">Tipo bulto<span className="ap-th-hint">ej: Caja, Pack</span></th>
                  <th className="ap-th-field">Cant. unidades<span className="ap-th-hint">por bulto</span></th>
                  <th className="ap-th-field">Precio bulto<span className="ap-th-hint">$</span></th>
                  <th className="ap-th-field">Precio unidad<span className="ap-th-hint">$ auto-calc</span></th>
                  <th className="ap-th-action"></th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const row = rows[p.id];
                  if (!row) return null;
                  const hasData = row.bulkUnit && row.bulkSize && row.bulkPrice && row.unitPrice;
                  return (
                    <tr key={p.id} className={`ap-row${hasData ? " ap-row--complete" : ""}${row.dirty ? " ap-row--dirty" : ""}`}>
                      <td className="ap-cell-name">
                        <span className="ap-cat-emoji">{p.category?.emoji ?? "📦"}</span>
                        <span>{p.name}</span>
                      </td>
                      <td className="ap-cell-code">{p.code}</td>
                      <td className="ap-cell-price">
                        <span className="ap-price-val">
                          ${p.price.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <button
                          className="ap-fill-btn"
                          title="Usar como precio de bulto"
                          onClick={() => fillBulkPrice(p)}
                        >↓ bulto</button>
                      </td>
                      <td>
                        <input
                          className="ap-input"
                          placeholder="Caja"
                          value={row.bulkUnit}
                          onChange={e => updateRow(p.id, "bulkUnit", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="ap-input ap-input--num"
                          type="number"
                          min="1"
                          placeholder="12"
                          value={row.bulkSize}
                          onChange={e => updateRow(p.id, "bulkSize", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="ap-input ap-input--num"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={row.bulkPrice}
                          onChange={e => updateRow(p.id, "bulkPrice", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className={`ap-input ap-input--num${row.bulkSize && row.bulkPrice ? " ap-input--auto" : ""}`}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={row.unitPrice}
                          onChange={e => updateRow(p.id, "unitPrice", e.target.value)}
                        />
                      </td>
                      <td className="ap-cell-action">
                        {row.saved ? (
                          <span className="ap-saved">✓</span>
                        ) : (
                          <button
                            className={`ap-save-btn${row.dirty ? " ap-save-btn--active" : ""}`}
                            onClick={() => saveRow(p.id)}
                            disabled={!row.dirty || row.saving}
                          >
                            {row.saving ? "…" : "Guardar"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="pagination" style={{ marginTop: 24 }}>
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</button>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                const n = Math.max(1, page - 5) + i;
                if (n > totalPages) return null;
                return (
                  <button key={n} className={`page-btn${page === n ? " active" : ""}`} onClick={() => setPage(n)}>{n}</button>
                );
              })}
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>→</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
