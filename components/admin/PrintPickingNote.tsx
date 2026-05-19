interface NoteItem {
  id: number;
  productCode: string | null;
  productName: string;
  quantity: number;
  pickedQuantity: number | null;
  unitPrice: number;
  subtotal: number;
  type: string;
  notes: string | null;
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
  createdAt: string;
  items: NoteItem[];
  user: { name: string; clientCode: string | null; company: string | null } | null;
  salesperson: { name: string } | null;
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n);
}
function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function PrintPickingNote({ note }: { note: PickingNote }) {
  const clientName = note.user?.name ?? note.clientName ?? "Sin nombre";
  const clientCode = note.clientCode ?? note.user?.clientCode ?? null;
  const company    = note.user?.company ?? null;
  const vendor     = note.salesperson?.name ?? note.salespersonName ?? "—";

  return (
    <div style={{
      fontFamily: "Arial, sans-serif",
      fontSize: 12,
      color: "#000",
      background: "#fff",
      padding: "20mm 15mm",
      maxWidth: "210mm",
      margin: "0 auto",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #000", paddingBottom: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#FF751F" }}>OSMAR</div>
          <div style={{ fontSize: 10, color: "#555" }}>Distribuidora Osmar</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1 }}>NOTA DE PEDIDO</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#FF751F" }}>{note.number}</div>
          <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>Fecha: {fmtDate(note.createdAt)}</div>
        </div>
      </div>

      {/* Client / Salesperson info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 4, padding: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 10, textTransform: "uppercase", color: "#666", marginBottom: 4 }}>CLIENTE</div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{clientName}</div>
          {clientCode && <div style={{ fontSize: 11, color: "#555" }}>Código: {clientCode}</div>}
          {company    && <div style={{ fontSize: 11, color: "#555" }}>{company}</div>}
        </div>
        <div style={{ border: "1px solid #ddd", borderRadius: 4, padding: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 10, textTransform: "uppercase", color: "#666", marginBottom: 4 }}>VENDEDOR</div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{vendor}</div>
          {note.notes && <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>Obs: {note.notes}</div>}
        </div>
      </div>

      {/* Items */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14, fontSize: 11 }}>
        <thead>
          <tr style={{ background: "#f4f4f4" }}>
            <th style={{ border: "1px solid #ccc", padding: "6px 8px", textAlign: "left" }}>Código</th>
            <th style={{ border: "1px solid #ccc", padding: "6px 8px", textAlign: "left" }}>Producto</th>
            <th style={{ border: "1px solid #ccc", padding: "6px 8px", textAlign: "center" }}>Tipo</th>
            <th style={{ border: "1px solid #ccc", padding: "6px 8px", textAlign: "center" }}>Cantidad</th>
            <th style={{ border: "1px solid #ccc", padding: "6px 8px", textAlign: "center", width: 60 }}>✓ Preparado</th>
            <th style={{ border: "1px solid #ccc", padding: "6px 8px", textAlign: "right" }}>P. Unit.</th>
            <th style={{ border: "1px solid #ccc", padding: "6px 8px", textAlign: "right" }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {note.items.map((item, i) => (
            <tr key={item.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
              <td style={{ border: "1px solid #ddd", padding: "5px 8px", color: "#555" }}>
                {item.productCode ?? "—"}
              </td>
              <td style={{ border: "1px solid #ddd", padding: "5px 8px", fontWeight: 500 }}>
                {item.productName}
              </td>
              <td style={{ border: "1px solid #ddd", padding: "5px 8px", textAlign: "center", color: "#555" }}>
                {item.type}
              </td>
              <td style={{ border: "1px solid #ddd", padding: "5px 8px", textAlign: "center", fontWeight: 700 }}>
                {item.quantity}
              </td>
              <td style={{ border: "1px solid #ddd", padding: "5px 8px", textAlign: "center" }}>
                {/* Empty checkbox for depot to fill manually */}
                <span style={{
                  display: "inline-block",
                  width: 22,
                  height: 22,
                  border: "1.5px solid #333",
                  borderRadius: 3,
                  textAlign: "center",
                  lineHeight: "22px",
                  fontSize: 13,
                }}>
                  {item.pickedQuantity !== null ? "✓" : ""}
                </span>
              </td>
              <td style={{ border: "1px solid #ddd", padding: "5px 8px", textAlign: "right" }}>
                {fmt(item.unitPrice)}
              </td>
              <td style={{ border: "1px solid #ddd", padding: "5px 8px", textAlign: "right", fontWeight: 600 }}>
                {fmt(item.subtotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <div style={{ minWidth: 220 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #eee", fontSize: 11, color: "#555" }}>
            <span>Subtotal</span><span>{fmt(note.subtotal)}</span>
          </div>
          {note.tax > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #eee", fontSize: 11, color: "#555" }}>
              <span>IVA</span><span>{fmt(note.tax)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontWeight: 800, fontSize: 13 }}>
            <span>TOTAL</span><span>{fmt(note.total)}</span>
          </div>
        </div>
      </div>

      {/* Signature boxes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 8 }}>
        <div style={{ border: "1px solid #333", borderRadius: 4, padding: 14, minHeight: 80 }}>
          <div style={{ fontWeight: 700, fontSize: 10, textTransform: "uppercase", marginBottom: 8 }}>
            Preparado y entregado por (Depósito)
          </div>
          <div style={{ marginTop: 36, borderTop: "1px solid #555", paddingTop: 4, fontSize: 10, color: "#555" }}>
            Nombre y firma
          </div>
        </div>
        <div style={{ border: "1px solid #333", borderRadius: 4, padding: 14, minHeight: 80 }}>
          <div style={{ fontWeight: 700, fontSize: 10, textTransform: "uppercase", marginBottom: 8 }}>
            Recibido conforme (Vendedor)
          </div>
          <div style={{ marginTop: 36, borderTop: "1px solid #555", paddingTop: 4, fontSize: 10, color: "#555" }}>
            Nombre y firma
          </div>
        </div>
      </div>

      {/* Confirmed stamp */}
      {note.status === "confirmed" && note.confirmedBy && (
        <div style={{
          marginTop: 16,
          border: "2px solid #10b981",
          borderRadius: 6,
          padding: 10,
          background: "#f0fdf4",
          fontSize: 11,
        }}>
          <strong style={{ color: "#059669" }}>✅ CONFIRMADO POR DEPÓSITO</strong>
          <span style={{ marginLeft: 12, color: "#555" }}>
            {note.confirmedBy} — {fmtDate(note.confirmedAt)}
          </span>
          {note.confirmedNotes && (
            <div style={{ marginTop: 4, color: "#666" }}>Obs: {note.confirmedNotes}</div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 20, borderTop: "1px solid #eee", paddingTop: 8, fontSize: 9, color: "#aaa", textAlign: "center" }}>
        {note.number} · Generado el {new Date().toLocaleDateString("es-AR")} · Sistema Osmar
      </div>
    </div>
  );
}
