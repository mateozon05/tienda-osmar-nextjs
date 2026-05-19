"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Product {
  id: number;
  code: string;
  name: string;
  imageUrl: string | null;
  active: boolean;
  category: { name: string; slug: string; emoji: string } | null;
}

type FilterMode = "all" | "with" | "without";

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildGoogleImgUrl(query: string) {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query + " producto")}`;
}

// ── Icon SVGs ─────────────────────────────────────────────────────────────────
function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  );
}
function IconUpload() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  );
}
function IconLink() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
    </svg>
  );
}
function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

// ── Modal de edición de imagen ────────────────────────────────────────────────
interface ImageModalProps {
  product: Product;
  onClose: () => void;
  onSaved: (id: number, url: string | null) => void;
}

function ImageModal({ product, onClose, onSaved }: ImageModalProps) {
  const [tab, setTab] = useState<"url" | "upload">("upload");
  const [urlInput, setUrlInput] = useState(product.imageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(product.imageUrl ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setError("");
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("productCode", product.code);

      const res = await fetch("/api/admin/products/upload-image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al subir");

      setUrlInput(data.url);
      setPreview(data.url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al subir");
      setPreview(product.imageUrl ?? null);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    const finalUrl = (tab === "url" ? urlInput.trim() : urlInput);
    if (!finalUrl) {
      setError("Ingresá una URL válida.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      // Siempre pasar por el endpoint que re-sube a Cloudinary si no es ya Cloudinary
      const res = await fetch("/api/admin/products/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: finalUrl, productId: product.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar");
      const savedUrl = data.url ?? finalUrl;
      setPreview(savedUrl);
      onSaved(product.id, savedUrl);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar. Intente de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setSaving(true);
    try {
      await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: null }),
      });
      onSaved(product.id, null);
      onClose();
    } catch {
      setError("Error al eliminar imagen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pimg-modal-overlay" onClick={onClose}>
      <div className="pimg-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pimg-modal-header">
          <div>
            <div className="pimg-modal-title">
              {product.category?.emoji ?? "📦"} {product.name}
            </div>
            <div className="pimg-modal-code">Código: {product.code}</div>
          </div>
          <button className="pimg-modal-close" onClick={onClose}><IconClose /></button>
        </div>

        {/* Tabs */}
        <div className="pimg-modal-tabs">
          <button
            className={`pimg-modal-tab${tab === "upload" ? " active" : ""}`}
            onClick={() => setTab("upload")}
          >
            <IconUpload /> Subir archivo
          </button>
          <button
            className={`pimg-modal-tab${tab === "url" ? " active" : ""}`}
            onClick={() => setTab("url")}
          >
            <IconLink /> Pegar URL
          </button>
        </div>

        <div className="pimg-modal-body">
          {/* Preview */}
          <div className="pimg-modal-preview-wrap">
            {preview ? (
              <img
                src={preview}
                alt={product.name}
                className="pimg-modal-preview-img"
                onError={() => setPreview(null)}
              />
            ) : (
              <div className="pimg-modal-preview-empty">
                <span style={{ fontSize: 40 }}>📷</span>
                <span>Sin imagen</span>
              </div>
            )}
          </div>

          {/* Upload tab */}
          {tab === "upload" && (
            <div className="pimg-modal-section">
              <div
                className="pimg-dropzone"
                onClick={() => fileRef.current?.click()}
              >
                <IconUpload />
                <span>{uploading ? "Subiendo a Cloudinary…" : "Clic para seleccionar imagen"}</span>
                <small>PNG, JPG, WebP — máx. 10 MB</small>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              {/* Google Images link */}
              <a
                href={buildGoogleImgUrl(product.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="pimg-google-link"
              >
                <IconSearch /> Buscar en Google Images
              </a>
            </div>
          )}

          {/* URL tab */}
          {tab === "url" && (
            <div className="pimg-modal-section">
              <label className="pimg-modal-label">URL de la imagen</label>
              <input
                type="url"
                className="pimg-modal-input"
                placeholder="https://ejemplo.com/imagen.jpg"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setPreview(e.target.value || null);
                }}
              />
              <p style={{ fontSize: 11, color: "#9CA3AF", margin: "6px 0 0", lineHeight: 1.4 }}>
                💡 Al guardar, la imagen se re-sube automáticamente a Cloudinary para evitar problemas de acceso.
              </p>
              <a
                href={buildGoogleImgUrl(product.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="pimg-google-link"
              >
                <IconSearch /> Buscar en Google Images
              </a>
            </div>
          )}

          {error && <div className="pimg-modal-error">{error}</div>}
        </div>

        {/* Footer */}
        <div className="pimg-modal-footer">
          {product.imageUrl && (
            <button
              className="pimg-btn pimg-btn--danger"
              onClick={handleRemove}
              disabled={saving}
            >
              <IconTrash /> Eliminar
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="pimg-btn pimg-btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="pimg-btn pimg-btn--primary"
            onClick={handleSave}
            disabled={saving || uploading}
          >
            <IconCheck /> {saving ? "Subiendo a Cloudinary…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Product card ──────────────────────────────────────────────────────────────
interface ProductCardProps {
  product: Product;
  onEdit: (p: Product) => void;
}
function ProductCard({ product, onEdit }: ProductCardProps) {
  const hasImage = !!product.imageUrl;
  return (
    <div
      className={`pimg-card${hasImage ? " pimg-card--has-img" : " pimg-card--no-img"}`}
      onClick={() => onEdit(product)}
      title={product.name}
    >
      <div className="pimg-card-img-wrap">
        {hasImage ? (
          <img
            src={product.imageUrl!}
            alt={product.name}
            className="pimg-card-img"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
              const wrap = e.currentTarget.parentElement!;
              const ph = wrap.querySelector(".pimg-card-placeholder") as HTMLElement;
              if (ph) ph.style.display = "flex";
            }}
          />
        ) : null}
        <div
          className="pimg-card-placeholder"
          style={{ display: hasImage ? "none" : "flex" }}
        >
          <span>{product.category?.emoji ?? "📦"}</span>
          <span className="pimg-card-placeholder-text">Sin imagen</span>
        </div>
      </div>
      <div className="pimg-card-info">
        <div className="pimg-card-name" title={product.name}>{product.name}</div>
        <div className="pimg-card-code">{product.code}</div>
        <div className="pimg-card-edit">
          {hasImage ? "✏️ Cambiar" : "➕ Agregar"}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProductImagesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 60;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products?limit=2000");
      const data = await res.json();
      setProducts(data.products ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Reset page on filter/search change
  useEffect(() => { setPage(1); }, [filter, search]);

  function handleSaved(id: number, url: string | null) {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, imageUrl: url } : p))
    );
  }

  // ── Derived state ──
  const filtered = products.filter((p) => {
    const matchFilter =
      filter === "all" ? true :
      filter === "with" ? !!p.imageUrl :
      !p.imageUrl;
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const withCount    = products.filter((p) => !!p.imageUrl).length;
  const withoutCount = products.filter((p) => !p.imageUrl).length;
  const pct = products.length ? Math.round((withCount / products.length) * 100) : 0;

  return (
    <div className="pimg-page">
      {/* ── Header ── */}
      <div className="pimg-header">
        <div>
          <h1 className="pimg-title">🖼️ Imágenes de productos</h1>
          <p className="pimg-subtitle">
            {withCount} con imagen · {withoutCount} sin imagen · {pct}% completado
          </p>
        </div>
        <button className="pimg-refresh-btn" onClick={fetchProducts}>
          ↺ Actualizar
        </button>
      </div>

      {/* ── Progress bar ── */}
      <div className="pimg-progress-wrap">
        <div className="pimg-progress-bar" style={{ width: `${pct}%` }} />
      </div>

      {/* ── Filters ── */}
      <div className="pimg-filters">
        <div className="pimg-filter-tabs">
          {(["all", "without", "with"] as FilterMode[]).map((f) => (
            <button
              key={f}
              className={`pimg-filter-tab${filter === f ? " active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all"     ? `Todos (${products.length})` :
               f === "without" ? `Sin imagen (${withoutCount})` :
               `Con imagen (${withCount})`}
            </button>
          ))}
        </div>
        <div className="pimg-search-wrap">
          <IconSearch />
          <input
            type="text"
            className="pimg-search"
            placeholder="Buscar producto o código…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="pimg-loading">Cargando productos…</div>
      ) : paginated.length === 0 ? (
        <div className="pimg-empty">No hay productos que coincidan.</div>
      ) : (
        <div className="pimg-grid">
          {paginated.map((p) => (
            <ProductCard key={p.id} product={p} onEdit={setEditProduct} />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="pimg-pagination">
          <button
            className="pimg-btn pimg-btn--ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Anterior
          </button>
          <span className="pimg-page-info">
            Página {page} de {totalPages} · {filtered.length} productos
          </span>
          <button
            className="pimg-btn pimg-btn--ghost"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* ── Modal ── */}
      {editProduct && (
        <ImageModal
          product={editProduct}
          onClose={() => setEditProduct(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
