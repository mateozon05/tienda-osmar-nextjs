"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PrintPickingNote from "@/components/admin/PrintPickingNote";
import PrintOrder from "@/components/admin/PrintOrder";

/* ── Types ── */
interface NoteItem {
  id: number;
  productId: number | null;
  productCode: string | null;
  productName: string;
  quantity: number;
  pickedQuantity: number | null;
  unitPrice: number;
  subtotal: number;
  type: string;
  notes: string | null;
  product: { id: number; name: string; code: string; imageUrl: string | null } | null;
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
  confirmedNotes: string | null;
  printedAt: string | null;
  printCount: number;
  createdAt: string;
  updatedAt: string;
  items: NoteItem[];
  user: { name: string; clientCode: string | null; company: string | null } | null;
  salesperson: { name: string } | null;
  order: { id: number; sipeNumber: string | null } | null;
}

interface OrderData {
  id: number;
  clientName: string | null;
  clientCode: string | null;
  subtotal: number;
  tax: number;
  total: number;
  totalWithTax: number;
  createdAt: string;
  items: { id: number; quantity: number; unitPrice: number; product: { id: number; name: string; code: string } }[];
  salesperson: { name: string } | null;
  user: { name: string; company: string | null } | null;
}

/* ── Helpers ── */
const STATUS_LABEL: Record<string, string> = {
  pending:   "Pendiente",
  preparing: "En preparación",
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
function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function PickingNoteDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();

  const [note, setNote]           = useState<PickingNote | null>(null);
  const [order, setOrder]         = useState<OrderData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  // Confirm panel
  const [confirmedBy, setConfirmedBy]     = useState("");
  const [confirmedNotes, setConfirmedNotes] = useState("");

  // Print refs
  const printNoteRef  = useRef<HTMLDivElement>(null);
  const printOrderRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    const res  = await fetch(`/api/admin/picking-notes/${id}`);
    const data = await res.json();
    setNote(data.note ?? null);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function patch(body: object) {
    setSaving(true);
    setError("");
    const res  = await fetch(`/api/admin/picking-notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Error"); setSaving(false); return; }
    setNote(data.note);
    setSaving(false);
  }

  async function handlePrint() {
    // Register print
    await patch({ action: "print" });
    window.print();
  }

  async function handleConfirm() {
    if (!confirmedBy.trim()) { setError("Ingresá el nombre del empleado de depósito"); return; }
    await patch({ action: "confirm", confirmedBy, confirmedNotes });
  }

  async function handleStatus(s: string) {
    await patch({ status: s });
  }

  async function handleToOrder() {
    setSaving(true);
    setError("");
    const res  = await fetch(`/api/admin/picking-notes/${id}/to-order`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Error"); setSaving(false); return; }
    setNote(data.note);
    setOrder(data.order);
    setSaving(false);
  }

  if (loading) return <div className="au-page" style={{ padding: 40, color: "#888" }}>Cargando…</div>;
  if (!note)   return <div className="au-page" style={{ padding: 40, color: "#888" }}>Nota no encontrada.</div>;

  const canConfirm   = note.status === "preparing";
  const canToOrder   = note.status === "confirmed" && !note.order;
  const canCancel    = note.status === "pending" || note.status === "preparing";
  const canPreparing = note.status === "pending";

  return (
    <div className="au-page" style={{ maxWidth: 960 }}>

      {/* ── Back + header ── */}
      <div style={{ marginBottom: 20 }}>
        <Link href="/picking-notes" style={{ color: "#888", fontSize: 14, textDecoration: "none" }}>
          ← Volver a Notas de Pedido
        </Link>
      </div>

      <div className="au-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="au-title" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            📋 {note.number}
            <span style={{
              fontSize: 14,
              fontWeight: 600,
              padding: "3px 12px",
              borderRadius: 12,
              background: STATUS_COLOR[note.status] + "22",
              color: STATUS_COLOR[note.status],
            }}>
              {STATUS_LABEL[note.status] ?? note.status}
            </span>
          </h1>
          <p style={{ color: "#888", fontSize: 13, margin: "4px 0 0" }}>
            Creada el {fmtDate(note.createdAt)}
            {note.printCount > 0 && ` · Impresa ${note.printCount} vez${note.printCount > 1 ? "es" : ""}`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="au-btn" onClick={handlePrint} disabled={saving} style={{ background: "#374151" }}>
            🖨️ Imprimir Nota
          </button>
          {canPreparing && (
            <button className="au-btn" onClick={() => handleStatus("preparing")} disabled={saving}>
              ▶ Iniciar Preparación
            </button>
          )}
          {canCancel && (
            <button
              className="au-btn"
              onClick={() => { if (confirm("¿Cancelar esta nota de pedido?")) handleStatus("cancelled"); }}
              disabled={saving}
              style={{ background: "#ef4444" }}
            >
              ✕ Cancelar
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* ── Info grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Client */}
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: 16 }}>
          <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Cliente</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{note.user?.name ?? note.clientName ?? "—"}</div>
          {note.clientCode && <div style={{ color: "#64748b", fontSize: 13 }}>Cód: {note.clientCode}</div>}
          {note.user?.company && <div style={{ color: "#64748b", fontSize: 13 }}>{note.user.company}</div>}
        </div>

        {/* Salesperson */}
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: 16 }}>
          <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Vendedor</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{note.salesperson?.name ?? note.salespersonName ?? "—"}</div>
        </div>

        {/* Totals */}
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: 16 }}>
          <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Totales</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#94a3b8" }}>
              <span>Subtotal</span><span>{fmt(note.subtotal)}</span>
            </div>
            {note.tax > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#94a3b8" }}>
                <span>IVA</span><span>{fmt(note.tax)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16, borderTop: "1px solid #334155", paddingTop: 8, marginTop: 4 }}>
              <span>Total</span><span style={{ color: "#FF751F" }}>{fmt(note.total)}</span>
            </div>
          </div>
        </div>

        {/* Confirm info / Order info */}
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: 16 }}>
          {note.status === "confirmed" ? (
            <>
              <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Confirmación del Depósito</div>
              <div style={{ fontWeight: 600, color: "#10b981" }}>✅ {note.confirmedBy}</div>
              <div style={{ color: "#64748b", fontSize: 13 }}>{fmtDate(note.confirmedAt)}</div>
              {note.confirmedNotes && <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>{note.confirmedNotes}</div>}
            </>
          ) : note.order ? (
            <>
              <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Orden de Venta</div>
              <div style={{ fontWeight: 600, color: "#10b981" }}>OV #{note.order.id}</div>
            </>
          ) : (
            <>
              <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Notas</div>
              <div style={{ color: "#64748b", fontSize: 13 }}>{note.notes ?? "Sin notas"}</div>
            </>
          )}
        </div>
      </div>

      {/* ── Items table ── */}
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, marginBottom: 24, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #334155", fontWeight: 600, color: "#94a3b8", fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>
          Ítems ({note.items.length})
        </div>
        <table className="au-table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>Producto</th>
              <th style={{ textAlign: "center" }}>Pedido</th>
              <th style={{ textAlign: "center" }}>Preparado</th>
              <th style={{ textAlign: "right" }}>Precio</th>
              <th style={{ textAlign: "right" }}>Subtotal</th>
              <th>Tipo</th>
            </tr>
          </thead>
          <tbody>
            {note.items.map(item => (
              <tr key={item.id} className="au-row">
                <td>
                  <div style={{ fontWeight: 500 }}>{item.productName}</div>
                  {item.productCode && <div style={{ fontSize: 12, color: "#64748b" }}>Cód: {item.productCode}</div>}
                </td>
                <td style={{ textAlign: "center", fontWeight: 600 }}>{item.quantity}</td>
                <td style={{ textAlign: "center" }}>
                  {item.pickedQuantity !== null ? (
                    <span style={{
                      fontWeight: 700,
                      color: item.pickedQuantity === item.quantity ? "#10b981" : item.pickedQuantity === 0 ? "#ef4444" : "#f59e0b",
                    }}>
                      {item.pickedQuantity}
                    </span>
                  ) : (
                    <span style={{ color: "#475569" }}>—</span>
                  )}
                </td>
                <td style={{ textAlign: "right" }}>{fmt(item.unitPrice)}</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>{fmt(item.subtotal)}</td>
                <td style={{ color: "#64748b", fontSize: 13 }}>{item.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Confirmation panel ── */}
      {canConfirm && (
        <div style={{
          background: "#0f172a",
          border: "2px solid #FF751F",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}>
          <h3 style={{ margin: "0 0 16px", color: "#FF751F", fontSize: 16 }}>
            ✍️ Confirmar preparación del depósito
          </h3>
          <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 16px" }}>
            Al confirmar, se registrará el nombre del empleado del depósito y la fecha/hora. Solo después de confirmar se podrá crear la Orden de Venta.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, color: "#94a3b8", display: "block", marginBottom: 4 }}>
                Nombre del empleado de depósito *
              </label>
              <input
                className="au-input"
                value={confirmedBy}
                onChange={e => setConfirmedBy(e.target.value)}
                placeholder="Ej: Juan González"
                style={{ width: "100%", maxWidth: 360 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, color: "#94a3b8", display: "block", marginBottom: 4 }}>
                Observaciones del depósito (opcional)
              </label>
              <textarea
                className="au-input"
                value={confirmedNotes}
                onChange={e => setConfirmedNotes(e.target.value)}
                placeholder="Ej: Falta 1 unidad del producto X"
                rows={3}
                style={{ width: "100%", resize: "vertical" }}
              />
            </div>
            <div>
              <button className="au-btn" onClick={handleConfirm} disabled={saving || !confirmedBy.trim()}>
                {saving ? "Guardando…" : "✅ Confirmar preparación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Convert to Order ── */}
      {canToOrder && (
        <div style={{
          background: "#0f172a",
          border: "2px solid #10b981",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}>
          <h3 style={{ margin: "0 0 8px", color: "#10b981", fontSize: 16 }}>
            🧾 Crear Orden de Venta
          </h3>
          <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 16px" }}>
            La nota fue confirmada por el depósito. Podés convertirla en una Orden de Venta.
          </p>
          <button className="au-btn" onClick={handleToOrder} disabled={saving} style={{ background: "#10b981" }}>
            {saving ? "Creando…" : "➕ Crear Orden de Venta"}
          </button>
        </div>
      )}

      {/* ── Order created banner ── */}
      {note.order && (
        <div style={{
          background: "#052e16",
          border: "1px solid #10b981",
          borderRadius: 10,
          padding: 16,
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}>
          <div>
            <div style={{ color: "#10b981", fontWeight: 700 }}>✅ Orden de Venta creada</div>
            <div style={{ color: "#6ee7b7", fontSize: 13, marginTop: 2 }}>OV #{note.order.id}</div>
          </div>
          {order && (
            <button
              className="au-btn"
              onClick={() => window.print()}
              style={{ background: "#374151", fontSize: 13 }}
            >
              🖨️ Imprimir OV
            </button>
          )}
        </div>
      )}

      {/* ── Print Templates (hidden, shown on print) ── */}
      <div ref={printNoteRef} className="print-only">
        <PrintPickingNote note={note} />
      </div>
      {order && (
        <div ref={printOrderRef} className="print-only">
          <PrintOrder order={order} />
        </div>
      )}
    </div>
  );
}
