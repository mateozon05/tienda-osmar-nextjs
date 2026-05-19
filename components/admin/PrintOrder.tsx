interface OrderItem {
  id: number;
  quantity: number;
  unitPrice: number;
  product: { id: number; name: string; code: string };
}

interface Order {
  id: number;
  clientName: string | null;
  clientCode: string | null;
  subtotal: number;
  tax: number;
  total: number;
  totalWithTax: number;
  createdAt: string;
  notes?: string | null;
  items: OrderItem[];
  salesperson: { name: string } | null;
  user: { name: string; company: string | null } | null;
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(n);
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function PrintOrder({ order }: { order: Order }) {
  const clientName = order.user?.name ?? order.clientName ?? "Sin nombre";
  const company    = order.user?.company ?? null;
  const vendor     = order.salesperson?.name ?? "—";

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
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1 }}>ORDEN DE VENTA</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#FF751F" }}>OV #{order.id}</div>
          <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>Fecha: {fmtDate(order.createdAt)}</div>
        </div>
      </div>

      {/* Client / Salesperson */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 4, padding: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 10, textTransform: "uppercase", color: "#666", marginBottom: 4 }}>CLIENTE</div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{clientName}</div>
          {order.clientCode && <div style={{ fontSize: 11, color: "#555" }}>Código: {order.clientCode}</div>}
          {company && <div style={{ fontSize: 11, color: "#555" }}>{company}</div>}
        </div>
        <div style={{ border: "1px solid #ddd", borderRadius: 4, padding: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 10, textTransform: "uppercase", color: "#666", marginBottom: 4 }}>VENDEDOR</div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{vendor}</div>
        </div>
      </div>

      {/* Items */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14, fontSize: 11 }}>
        <thead>
          <tr style={{ background: "#f4f4f4" }}>
            <th style={{ border: "1px solid #ccc", padding: "6px 8px", textAlign: "left" }}>Código</th>
            <th style={{ border: "1px solid #ccc", padding: "6px 8px", textAlign: "left" }}>Producto</th>
            <th style={{ border: "1px solid #ccc", padding: "6px 8px", textAlign: "center" }}>Cantidad</th>
            <th style={{ border: "1px solid #ccc", padding: "6px 8px", textAlign: "right" }}>P. Unitario</th>
            <th style={{ border: "1px solid #ccc", padding: "6px 8px", textAlign: "right" }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, i) => (
            <tr key={item.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
              <td style={{ border: "1px solid #ddd", padding: "5px 8px", color: "#555" }}>{item.product.code}</td>
              <td style={{ border: "1px solid #ddd", padding: "5px 8px", fontWeight: 500 }}>{item.product.name}</td>
              <td style={{ border: "1px solid #ddd", padding: "5px 8px", textAlign: "center", fontWeight: 700 }}>{item.quantity}</td>
              <td style={{ border: "1px solid #ddd", padding: "5px 8px", textAlign: "right" }}>{fmt(item.unitPrice)}</td>
              <td style={{ border: "1px solid #ddd", padding: "5px 8px", textAlign: "right", fontWeight: 600 }}>{fmt(item.unitPrice * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
        <div style={{ minWidth: 220 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #eee", fontSize: 11, color: "#555" }}>
            <span>Subtotal</span><span>{fmt(order.subtotal)}</span>
          </div>
          {order.tax > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #eee", fontSize: 11, color: "#555" }}>
              <span>IVA</span><span>{fmt(order.tax)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontWeight: 800, fontSize: 13 }}>
            <span>TOTAL</span><span>{fmt(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Signature */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div style={{ border: "1px solid #333", borderRadius: 4, padding: 14, minHeight: 80 }}>
          <div style={{ fontWeight: 700, fontSize: 10, textTransform: "uppercase", marginBottom: 8 }}>Conformidad del cliente</div>
          <div style={{ marginTop: 36, borderTop: "1px solid #555", paddingTop: 4, fontSize: 10, color: "#555" }}>
            Nombre y firma
          </div>
        </div>
        <div style={{ border: "1px solid #333", borderRadius: 4, padding: 14, minHeight: 80 }}>
          <div style={{ fontWeight: 700, fontSize: 10, textTransform: "uppercase", marginBottom: 8 }}>Vendedor</div>
          <div style={{ fontWeight: 700, fontSize: 12, marginTop: 4 }}>{vendor}</div>
          <div style={{ marginTop: 22, borderTop: "1px solid #555", paddingTop: 4, fontSize: 10, color: "#555" }}>
            Firma
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 20, borderTop: "1px solid #eee", paddingTop: 8, fontSize: 9, color: "#aaa", textAlign: "center" }}>
        OV #{order.id} · Generado el {new Date().toLocaleDateString("es-AR")} · Sistema Osmar
      </div>
    </div>
  );
}
