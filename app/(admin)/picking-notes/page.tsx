"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import NewOrderModal from "@/components/admin/NewOrderModal";

/* ── Types ── */
interface PickingNoteItem {
  id: number;
  productName: string;
  productCode: string | null;
  quantity: number;
  pickedQuantity: number | null;
  unitPrice: number;
  subtotal: number;
  type: string;
}

interface PickingNote {
  id: number;
  number: string;
  status: string;
  clientCode: string | null;
  clientName: string | null;
  salespersonName: string | null;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
  printedAt: string | null;
  printCount: number;
  createdAt: string;
  items: PickingNoteItem[];
  user: { name: string; clientCode: string | null; company: string | null } | null;
  salesperson: { name: string } | null;
  order: { id: number; sipeNumber: string | null } | null;
}

/* ── Helpers ── */
const STATUS_LABEL: Record<string, string> = {
  pending:   "Pendiente",
  preparing: "Preparando",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
};
const STATUS_COLOR: Record<string, string> = {
  pending:   "#f59e0b",
  preparing: "#3b82f6",
  confirmed: "#10b981",
  cancelled: "#ef4444",
};

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n);
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

async function downloadExcel(noteId: number, noteNumber: string) {
  const res  = await fetch(`/api/admin/picking-notes/${noteId}/export-sipe`);
  const data = await res.json();
  if (!res.ok) return;
  const link    = document.createElement("a");
  link.href     = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${data.excel}`;
  link.download = data.filename ?? `${noteNumber}-SIPE.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function PickingNotesPage() {
  const [notes, setNotes]       = useState<PickingNote[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [status, setStatus]     = useState("");
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: "20" });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const res = await fetch(`/api/admin/picking-notes?${params}`);
    const data = await res.json();
    setNotes(data.notes ?? []);
    setTotal(data.total ?? 0);
    setTotalPages(data.totalPages ?? 1);
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => { load(1); setPage(1); }, [search, status]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="au-page">
      {/* Header */}
      <div className="au-header">
        <div>
          <h1 className="au-title">📋 Notas de Pedido</h1>
          <p style={{ color: "#888", margin: "4px 0 0", fontSize: 14 }}>
            {total} nota{total !== 1 ? "s" : ""} encontrada{total !== 1 ? "s" : ""}
          </p>
        </div>
        <button className="au-btn" onClick={() => setShowModal(true)}>
          + Nueva Nota
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          className="au-input"
          placeholder="Buscar cliente, número, vendedor…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: "1 1 240px", maxWidth: 360 }}
        />
        <select
          className="au-input"
          value={status}
          onChange={e => setStatus(e.target.value)}
          style={{ minWidth: 160 }}
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="preparing">Preparando</option>
          <option value="confirmed">Confirmada</option>
          <option value="cancelled">Cancelada</option>
        </select>
      </div>

      {/* Table */}
      <div className="au-table-wrap">
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Cargando…</div>
        ) : notes.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#888" }}>
            No se encontraron notas de pedido.
          </div>
        ) : (
          <table className="au-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Fecha</th>
                <th>Orden de Venta</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {notes.map(note => (
                <tr key={note.id} className="au-row">
                  <td>
                    <strong style={{ fontFamily: "monospace", color: "#FF751F" }}>{note.number}</strong>
                    {note.printCount > 0 && (
                      <span style={{ marginLeft: 6, fontSize: 11, color: "#888" }}>
                        🖨️ ×{note.printCount}
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>
                      {note.user?.name ?? note.clientName ?? "—"}
                    </div>
                    {note.clientCode && (
                      <div style={{ fontSize: 12, color: "#888" }}>{note.clientCode}</div>
                    )}
                    {note.user?.company && (
                      <div style={{ fontSize: 12, color: "#aaa" }}>{note.user.company}</div>
                    )}
                  </td>
                  <td style={{ color: "#666" }}>
                    {note.salesperson?.name ?? note.salespersonName ?? "—"}
                  </td>
                  <td>
                    <span style={{
                      display: "inline-block",
                      padding: "2px 10px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      background: STATUS_COLOR[note.status] + "22",
                      color: STATUS_COLOR[note.status],
                    }}>
                      {STATUS_LABEL[note.status] ?? note.status}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{fmt(note.total)}</td>
                  <td style={{ fontSize: 13, color: "#666" }}>{fmtDate(note.createdAt)}</td>
                  <td>
                    {note.order ? (
                      <Link
                        href={`/orders`}
                        style={{ fontSize: 12, color: "#10b981", fontWeight: 600, textDecoration: "none" }}
                      >
                        ✅ #{note.order.id}
                      </Link>
                    ) : note.status === "confirmed" ? (
                      <span style={{ fontSize: 12, color: "#f59e0b" }}>Pendiente crear OV</span>
                    ) : (
                      <span style={{ fontSize: 12, color: "#ccc" }}>—</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <button
                        onClick={() => downloadExcel(note.id, note.number)}
                        title="Descargar Excel SIPE"
                        style={{
                          background: "#dcfce7", color: "#16a34a",
                          border: "none", borderRadius: 8,
                          padding: "4px 8px", cursor: "pointer",
                          fontSize: 14, lineHeight: 1,
                        }}
                      >
                        📥
                      </button>
                      <Link
                        href={`/picking-notes/${note.id}`}
                        className="au-btn"
                        style={{ fontSize: 13, padding: "4px 14px" }}
                      >
                        Ver →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 24, alignItems: "center" }}>
          <button
            className="au-btn"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            style={{ opacity: page <= 1 ? 0.4 : 1 }}
          >
            ← Anterior
          </button>
          <span style={{ color: "#888", fontSize: 14 }}>Pág. {page} / {totalPages}</span>
          <button
            className="au-btn"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            style={{ opacity: page >= totalPages ? 0.4 : 1 }}
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* New Note Modal (reuses NewOrderModal which now creates picking notes) */}
      {showModal && (
        <NewOrderModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); load(1); setPage(1); }}
        />
      )}
    </div>
  );
}
