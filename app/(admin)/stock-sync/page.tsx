"use client";

import { useState, useRef } from "react";

interface SyncResult {
  code: string;
  name: string;
  oldStock: number | null;
  newStock: number;
  status: "updated" | "unchanged" | "not_found";
}

interface PreviewData {
  dryRun: boolean;
  summary: {
    total: number;
    updated: number;
    unchanged: number;
    notFound: number;
  };
  results: SyncResult[];
}

export default function StockSyncPage() {
  const [file, setFile]       = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(selected: File) {
    setFile(selected);
    setPreview(null);
    setApplied(false);
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("file",   selected);
      fd.append("dryRun", "true");

      const res  = await fetch("/api/admin/stock-sync", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreview(data);
    } catch (err: unknown) {
      alert("Error al leer el archivo: " + (err instanceof Error ? err.message : String(err)));
      setFile(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    if (!file || !preview) return;
    if (!confirm(`¿Confirmás actualizar el stock de ${preview.summary.updated} productos?`)) return;

    setApplying(true);
    try {
      const fd = new FormData();
      fd.append("file",   file);
      fd.append("dryRun", "false");

      const res  = await fetch("/api/admin/stock-sync", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreview(data);
      setApplied(true);
    } catch (err: unknown) {
      alert("Error al aplicar la sincronización: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setApplying(false);
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setApplied(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const updatedRows = preview?.results.filter((r) => r.status === "updated") ?? [];
  const notFoundRows = preview?.results.filter((r) => r.status === "not_found") ?? [];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sincronizar Stock</h1>
        <p className="text-gray-500 text-sm mt-1">
          Subí el Excel de &quot;Stock de Artículos&quot; exportado desde SIPE para actualizar el stock de todos los productos.
        </p>
      </div>

      {/* Drop zone */}
      {!file && !loading && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) handleFileSelect(f);
          }}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/30 transition-colors"
        >
          <div className="text-4xl mb-3">📊</div>
          <p className="font-semibold text-gray-700">Arrastrá el Excel acá o hacé click para seleccionar</p>
          <p className="text-sm text-gray-400 mt-1">Exportación de Stock de Artículos desde SIPE (.xlsx)</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
            }}
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Leyendo el archivo...</p>
        </div>
      )}

      {/* Preview + actions */}
      {preview && !loading && (
        <div className="space-y-4">

          {/* File name */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>📄</span>
            <span className="font-medium text-gray-700">{file?.name}</span>
            {!applied && (
              <button onClick={reset} className="ml-auto text-gray-400 hover:text-gray-600 underline text-xs">
                Cambiar archivo
              </button>
            )}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{preview.summary.total}</p>
              <p className="text-xs text-gray-500 mt-1">Total en el Excel</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{preview.summary.updated}</p>
              <p className="text-xs text-green-600 mt-1">Para actualizar</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-500">{preview.summary.unchanged}</p>
              <p className="text-xs text-gray-400 mt-1">Sin cambios</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-700">{preview.summary.notFound}</p>
              <p className="text-xs text-amber-600 mt-1">No encontrados</p>
            </div>
          </div>

          {/* Success state */}
          {applied ? (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
              <p className="font-bold text-green-800 text-lg">✅ Stock actualizado correctamente</p>
              <p className="text-sm text-green-600 mt-1">
                {preview.summary.updated} productos actualizados
              </p>
              <button
                onClick={reset}
                className="mt-4 px-5 py-2 bg-white border border-green-300 text-green-700 rounded-lg text-sm font-medium hover:bg-green-50 transition-colors"
              >
                Sincronizar otro archivo
              </button>
            </div>
          ) : (
            <>
              {/* Changes table */}
              {updatedRows.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase">
                      Cambios a aplicar ({updatedRows.length})
                    </p>
                  </div>
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Código</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Producto</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500">Actual</th>
                          <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500">Nuevo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {updatedRows.slice(0, 200).map((r, i) => (
                          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <td className="px-4 py-2 font-mono text-xs text-gray-500">{r.code}</td>
                            <td className="px-4 py-2 text-gray-800">{r.name}</td>
                            <td className="px-4 py-2 text-center text-gray-400">{r.oldStock}</td>
                            <td className="px-4 py-2 text-center font-semibold text-green-700">{r.newStock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {updatedRows.length > 200 && (
                    <p className="text-xs text-gray-400 text-center py-2 bg-gray-50 border-t border-gray-100">
                      Mostrando 200 de {updatedRows.length} cambios — todos se aplicarán al confirmar
                    </p>
                  )}
                </div>
              )}

              {updatedRows.length === 0 && (
                <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-500 text-sm">
                  El stock de todos los productos ya está actualizado. No hay cambios para aplicar.
                </div>
              )}

              {/* Not found (collapsible) */}
              {notFoundRows.length > 0 && (
                <details className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <summary className="cursor-pointer font-medium text-amber-800 text-sm select-none">
                    ⚠️ {notFoundRows.length} productos del Excel no existen en la tienda
                  </summary>
                  <p className="text-xs text-amber-600 mt-2 mb-3">
                    Estos códigos están en SIPE pero no en la tienda. No se toca nada.
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {notFoundRows.map((r, i) => (
                      <p key={i} className="text-xs text-amber-700 font-mono">
                        [{r.code}] {r.name}
                      </p>
                    ))}
                  </div>
                </details>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={reset}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleApply}
                  disabled={applying || preview.summary.updated === 0}
                  className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {applying
                    ? "Aplicando..."
                    : preview.summary.updated === 0
                    ? "Sin cambios para aplicar"
                    : `Confirmar y actualizar ${preview.summary.updated} productos`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
