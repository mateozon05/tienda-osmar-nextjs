"use client";

import { useState, useEffect, useRef } from "react";

interface Product {
  id:       number;
  code:     string;
  name:     string;
  imageUrl: string | null;
}

interface PendingItem {
  productId: number;
  imageUrl:  string;
  preview:   string;
  status:    "pending" | "uploading" | "done" | "error";
  error?:    string;
}

type ResultItem = {
  productId: number;
  status: "success" | "error";
  imageUrl?: string;
  error?: string;
};

export default function BulkImagesPage() {
  const [products,      setProducts]      = useState<Product[]>([]);
  const [search,        setSearch]        = useState("");
  const [pending,       setPending]       = useState<Map<number, PendingItem>>(new Map());
  const [uploading,     setUploading]     = useState(false);
  const [progress,      setProgress]      = useState({ done: 0, total: 0 });
  const [showOnlyEmpty, setShowOnlyEmpty] = useState(true);
  const [loading,       setLoading]       = useState(true);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function fetchProducts(q: string, noImage: boolean) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q,
        status:  "all",
        limit:   "200",
        noImage: noImage ? "true" : "false",
      });
      const res  = await fetch(`/api/admin/products?${params}`);
      const data = await res.json();
      setProducts(data.products ?? []);
    } finally {
      setLoading(false);
    }
  }

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchProducts(search, showOnlyEmpty);
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search, showOnlyEmpty]);

  function handleUrlChange(productId: number, url: string) {
    const trimmed = url.trim();
    setPending((prev) => {
      const next = new Map(prev);
      if (!trimmed) {
        next.delete(productId);
      } else {
        const existing = next.get(productId);
        // No pisar un estado done/error con un nuevo pending
        if (existing?.status === "done") return prev;
        next.set(productId, {
          productId,
          imageUrl: trimmed,
          preview:  trimmed,
          status:   "pending",
        });
      }
      return next;
    });
  }

  async function handleUploadAll() {
    const items = Array.from(pending.values()).filter((p) => p.status === "pending");
    if (items.length === 0) return;

    setUploading(true);
    setProgress({ done: 0, total: items.length });

    const BATCH = 5;
    for (let i = 0; i < items.length; i += BATCH) {
      const batch = items.slice(i, i + BATCH);

      setPending((prev) => {
        const next = new Map(prev);
        batch.forEach((item) => next.set(item.productId, { ...item, status: "uploading" }));
        return next;
      });

      try {
        const res = await fetch("/api/admin/products/bulk-images", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ items: batch.map((item) => ({ productId: item.productId, imageUrl: item.imageUrl })) }),
        });
        const data = await res.json() as { results: ResultItem[] };

        setPending((prev) => {
          const next = new Map(prev);
          (data.results ?? []).forEach((result) => {
            const item = next.get(result.productId);
            if (!item) return;
            if (result.status === "success") {
              next.set(result.productId, { ...item, status: "done", preview: result.imageUrl ?? item.preview, imageUrl: result.imageUrl ?? item.imageUrl });
            } else {
              next.set(result.productId, { ...item, status: "error", error: result.error });
            }
          });
          return next;
        });
      } catch {
        setPending((prev) => {
          const next = new Map(prev);
          batch.forEach((item) => next.set(item.productId, { ...item, status: "error", error: "Error de red" }));
          return next;
        });
      }

      setProgress((prev) => ({ ...prev, done: prev.done + batch.length }));
    }

    setUploading(false);
    // Recargar para quitar los que ya tienen foto
    await fetchProducts(search, showOnlyEmpty);
  }

  const pendingCount  = Array.from(pending.values()).filter((p) => p.status === "pending").length;
  const doneCount     = Array.from(pending.values()).filter((p) => p.status === "done").length;
  const errorCount    = Array.from(pending.values()).filter((p) => p.status === "error").length;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Carga masiva de imágenes</h1>
        <p className="text-gray-500 text-sm mt-1">
          Pegá la URL de la imagen al lado de cada producto. Cuando tengas varias listas, hacé click en &quot;Subir todas&quot;.
        </p>
      </div>

      {/* Barra de acciones */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por nombre o código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500"
        />
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none whitespace-nowrap">
          <input
            type="checkbox"
            checked={showOnlyEmpty}
            onChange={(e) => setShowOnlyEmpty(e.target.checked)}
            className="rounded"
          />
          Solo sin foto
        </label>
        {pendingCount > 0 && (
          <button
            onClick={handleUploadAll}
            disabled={uploading}
            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl disabled:opacity-50 transition-colors"
          >
            {uploading
              ? `Subiendo ${progress.done}/${progress.total}...`
              : `⬆️ Subir ${pendingCount} imagen${pendingCount !== 1 ? "es" : ""}`}
          </button>
        )}
      </div>

      {/* Stats */}
      {(doneCount > 0 || errorCount > 0) && (
        <div className="flex gap-3 mb-4 flex-wrap">
          {doneCount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-sm text-green-700 font-medium">
              ✅ {doneCount} subidas correctamente
            </div>
          )}
          {errorCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-700 font-medium">
              ❌ {errorCount} con error — revisá las URLs
            </div>
          )}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando productos...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {showOnlyEmpty ? "🎉 Todos los productos tienen foto" : "No se encontraron productos"}
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((product) => {
            const item = pending.get(product.id);
            return (
              <ProductRow
                key={product.id}
                product={product}
                item={item}
                onUrlChange={handleUrlChange}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// Componente separado para evitar re-renders de toda la lista en cada keystroke
function ProductRow({
  product,
  item,
  onUrlChange,
}: {
  product: Product;
  item:    PendingItem | undefined;
  onUrlChange: (id: number, url: string) => void;
}) {
  const isDone      = item?.status === "done";
  const isUploading = item?.status === "uploading";
  const isError     = item?.status === "error";

  const previewSrc = item?.preview || product.imageUrl || null;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
        isDone      ? "border-green-200 bg-green-50" :
        isError     ? "border-red-200 bg-red-50" :
        isUploading ? "border-orange-200 bg-orange-50" :
                      "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      {/* Preview */}
      <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
        {previewSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewSrc}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <span className="text-2xl">📦</span>
        )}
      </div>

      {/* Info */}
      <div className="w-48 shrink-0 min-w-0">
        <p className="font-medium text-gray-900 text-sm truncate">{product.name}</p>
        <p className="text-xs text-gray-400 font-mono">{product.code}</p>
      </div>

      {/* Input / estado */}
      <div className="flex-1 min-w-0">
        {isDone ? (
          <span className="text-sm text-green-600 font-medium">✅ Subida</span>
        ) : isUploading ? (
          <span className="text-sm text-orange-600 animate-pulse">⏳ Subiendo...</span>
        ) : (
          <>
            <input
              type="text"
              placeholder="Pegá la URL de la imagen acá..."
              defaultValue={item?.imageUrl ?? ""}
              onChange={(e) => onUrlChange(product.id, e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-orange-500 ${
                isError ? "border-red-300 bg-red-50" : "border-gray-200"
              }`}
            />
            {isError && (
              <p className="text-xs text-red-500 mt-1 truncate">❌ {item?.error}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
