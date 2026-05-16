"use client";

import { useState, useEffect, useCallback } from "react";

interface HistoryOrder {
  id: number;
  sipeId: number | null;
  sipeNumber: string | null;
  orderType: string;
  status: string;
  clientCode: string | null;
  clientName: string | null;
  salespersonName: string | null;
  invoiceNumber: string | null;
  invoiceType: string | null;
  total: number;
  subtotal: number;
  tax: number;
  totalWithTax: number;
  channel: string | null;
  branch: string | null;
  orderDate: string;
  user: { id: number; clientCode: string | null; name: string } | null;
  salesperson: { id: number; name: string } | null;
}

interface Agg {
  totalSales: number;
  totalWithTax: number;
  totalTax: number;
  count: number;
}

interface Salesperson { id: number; name: string }

function fmt(n: number) {
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function OrderTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    invoiced: { label: "Facturada",    cls: "oh-badge oh-badge--invoiced" },
    order:    { label: "Sin factura",  cls: "oh-badge oh-badge--order" },
  };
  const s = map[type] ?? { label: type, cls: "oh-badge" };
  return <span className={s.cls}>{s.label}</span>;
}

export default function OrdersHistoryPage() {
  const [orders,  setOrders]  = useState<HistoryOrder[]>([]);
  const [total,   setTotal]   = useState(0);
  const [agg,     setAgg]     = useState<Agg | null>(null);
  const [loading, setLoading] = useState(true);
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);

  // Filters
  const [q,             setQ]             = useState("");
  const [from,          setFrom]          = useState("");
  const [to,            setTo]            = useState("");
  const [salespersonId, setSalespersonId] = useState("");
  const [orderType,     setOrderType]     = useState("");
  const [page,          setPage]          = useState(1);
  const LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (q)             params.set("q",             q);
    if (from)          params.set("from",          from);
    if (to)            params.set("to",            to);
    if (salespersonId) params.set("salespersonId", salespersonId);
    if (orderType)     params.set("orderType",     orderType);

    const res  = await fetch(`/api/admin/orders/history?${params}`);
    const data = await res.json();
    setOrders(data.orders ?? []);
    setTotal(data.total  ?? 0);
    setAgg(data.agg      ?? null);
    setLoading(false);
  }, [q, from, to, salespersonId, orderType, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [q, from, to, salespersonId, orderType]);

  useEffect(() => {
    fetch("/api/admin/salespersons?status=active")
      .then((r) => r.json())
      .then((d) => setSalespersons(d.salespersons ?? []));
  }, []);

  function exportExcel() {
    const params = new URLSearchParams({ export: "1", limit: "999999" });
    if (q)             params.set("q",             q);
    if (from)          params.set("from",          from);
    if (to)            params.set("to",            to);
    if (salespersonId) params.set("salespersonId", salespersonId);
    if (orderType)     params.set("orderType",     orderType);
    // Download via API then trigger client-side save
    fetch(`/api/admin/orders/history?${params}`)
      .then((r) => r.json())
      .then(async (data) => {
        const XLSX = await import("xlsx");
        const rows = (data.orders as HistoryOrder[]).map((o) => ({
          "N° SIPE":     o.sipeNumber,
          "Fecha":       fmtDate(o.orderDate),
          "Sucursal":    o.branch,
          "Canal":       o.channel,
          "Cód. Cliente": o.clientCode,
          "Cliente":     o.clientName ?? o.user?.name,
          "Vendedor":    o.salesperson?.name ?? o.salespersonName,
          "Total":       o.total,
          "Neto":        o.subtotal,
          "IVA":         o.tax,
          "Total c/IVA": o.totalWithTax,
          "Factura":     o.invoiceNumber,
          "Tipo":        o.orderType === "invoiced" ? "Facturada" : "Sin factura",
        }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Órdenes");
        XLSX.writeFile(wb, `historial-sipe-${new Date().toISOString().slice(0,10)}.xlsx`);
      });
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="oh-page">
      {/* Header */}
      <div className="oh-header">
        <div>
          <h1 className="oh-title">📋 Historial SIPE</h1>
          <p className="oh-subtitle">Órdenes importadas de SIPE · Mayo 2025 – Mayo 2026</p>
        </div>
        <button className="oh-btn-export" onClick={exportExcel}>
          📥 Exportar Excel
        </button>
      </div>

      {/* Stats */}
      {agg && (
        <div className="oh-stats">
          <div className="oh-stat">
            <div className="oh-stat-val">{agg.count.toLocaleString("es-AR")}</div>
            <div className="oh-stat-lbl">Órdenes</div>
          </div>
          <div className="oh-stat">
            <div className="oh-stat-val">{fmt(agg.totalSales)}</div>
            <div className="oh-stat-lbl">Ventas (sin IVA)</div>
          </div>
          <div className="oh-stat oh-stat--accent">
            <div className="oh-stat-val">{fmt(agg.totalWithTax > 0 ? agg.totalWithTax : agg.totalSales)}</div>
            <div className="oh-stat-lbl">Total</div>
          </div>
          <div className="oh-stat">
            <div className="oh-stat-val">{fmt(agg.totalTax)}</div>
            <div className="oh-stat-lbl">IVA</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="oh-filters">
        <input
          className="oh-search"
          placeholder="Buscar N° orden, cliente, código, factura, vendedor…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="oh-filter-row">
          <div className="oh-filter-group">
            <label className="oh-filter-label">Desde</label>
            <input className="oh-input-date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="oh-filter-group">
            <label className="oh-filter-label">Hasta</label>
            <input className="oh-input-date" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <select className="oh-select" value={salespersonId} onChange={(e) => setSalespersonId(e.target.value)}>
            <option value="">Todos los vendedores</option>
            {salespersons.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select className="oh-select" value={orderType} onChange={(e) => setOrderType(e.target.value)}>
            <option value="">Todas las órdenes</option>
            <option value="invoiced">Facturadas</option>
            <option value="order">Sin factura</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="oh-loading">Cargando historial…</div>
      ) : orders.length === 0 ? (
        <div className="oh-empty">No hay órdenes con los filtros aplicados.</div>
      ) : (
        <>
          <div className="oh-table-wrap">
            <table className="oh-table">
              <thead>
                <tr>
                  <th>N° Orden</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Vendedor</th>
                  <th>Total</th>
                  <th>c/IVA</th>
                  <th>Tipo</th>
                  <th>Factura</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <code className="oh-code">{o.sipeNumber}</code>
                    </td>
                    <td className="oh-td-date">{fmtDate(o.orderDate)}</td>
                    <td>
                      <div className="oh-client-name">{o.user?.name ?? o.clientName ?? "—"}</div>
                      {o.clientCode && <div className="oh-client-code">[{o.clientCode}]</div>}
                    </td>
                    <td className="oh-td-muted">
                      {o.salesperson?.name ?? o.salespersonName ?? "—"}
                    </td>
                    <td className="oh-td-num">{fmt(o.total)}</td>
                    <td className="oh-td-num">
                      {o.totalWithTax > 0 ? fmt(o.totalWithTax) : "—"}
                    </td>
                    <td><OrderTypeBadge type={o.orderType} /></td>
                    <td className="oh-td-invoice">
                      {o.invoiceNumber
                        ? <span title={o.invoiceNumber} className="oh-invoice">{o.invoiceNumber.slice(0, 20)}</span>
                        : <span className="oh-td-muted">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="oh-pagination">
              <button className="oh-btn-page" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Anterior</button>
              <span className="oh-page-info">Página {page} de {totalPages} · {total.toLocaleString("es-AR")} órdenes</span>
              <button className="oh-btn-page" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
