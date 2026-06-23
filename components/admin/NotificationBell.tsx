"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface PendingUser {
  id: number;
  name: string;
  email: string | null;
  company: string | null;
  clientCode: string | null;
  createdAt: string;
}

interface PriceList {
  id: number;
  name: string;
  type: string;
}

export default function NotificationBell() {
  const [pendingCount, setPendingCount] = useState(0);
  const [pending, setPending]           = useState<PendingUser[]>([]);
  const [open, setOpen]                 = useState(false);
  const [approveUser, setApproveUser]   = useState<PendingUser | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router   = useRouter();

  async function fetchNotifications() {
    try {
      const res  = await fetch("/api/admin/notifications");
      const data = await res.json();
      if (res.ok) {
        setPendingCount(data.pendingCount);
        setPending(data.pending);
      }
    } catch {}
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={panelRef}>
      {/* Campanita */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Solicitudes de registro"
        style={{
          display:        "flex",
          alignItems:     "center",
          gap:            "8px",
          width:          "100%",
          padding:        "10px 12px",
          borderRadius:   "10px",
          border:         "none",
          background:     pendingCount > 0 ? "rgba(239,68,68,0.08)" : "transparent",
          cursor:         "pointer",
          color:          pendingCount > 0 ? "#ef4444" : "var(--admin-muted, #6B7280)",
          fontSize:       "14px",
          fontWeight:     500,
          position:       "relative",
        }}
      >
        {/* Bell SVG */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <span>Solicitudes</span>
        {pendingCount > 0 && (
          <span style={{
            marginLeft:      "auto",
            background:      "#ef4444",
            color:           "#fff",
            fontSize:        "11px",
            fontWeight:      700,
            borderRadius:    "999px",
            padding:         "1px 7px",
            minWidth:        "20px",
            textAlign:       "center",
          }}>
            {pendingCount > 99 ? "99+" : pendingCount}
          </span>
        )}
      </button>

      {/* Panel desplegable */}
      {open && (
        <div style={{
          position:    "absolute",
          left:        "calc(100% + 8px)",
          top:         0,
          width:       "360px",
          background:  "#fff",
          borderRadius: "16px",
          boxShadow:   "0 8px 32px rgba(0,0,0,0.14)",
          border:      "1px solid #e5e7eb",
          zIndex:      100,
          overflow:    "hidden",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #f3f4f6" }}>
            <span style={{ fontWeight: 600, fontSize: "14px", color: "#111827" }}>Solicitudes de registro</span>
            {pendingCount > 0 && (
              <span style={{ background: "#fee2e2", color: "#dc2626", fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "999px" }}>
                {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {pending.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>
              No hay solicitudes pendientes
            </div>
          ) : (
            <div style={{ maxHeight: "360px", overflowY: "auto" }}>
              {pending.map((user) => (
                <div key={user.id} style={{ padding: "12px 16px", borderBottom: "1px solid #f9fafb", display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "13px", color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user.name}
                    </p>
                    {user.company && (
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {user.company}
                      </p>
                    )}
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#9ca3af" }}>
                      {new Date(user.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <button
                    onClick={() => { setApproveUser(user); setOpen(false); }}
                    style={{
                      flexShrink:   0,
                      background:   "#FF751F",
                      color:        "#fff",
                      border:       "none",
                      borderRadius: "8px",
                      padding:      "6px 12px",
                      fontSize:     "12px",
                      fontWeight:   600,
                      cursor:       "pointer",
                    }}
                  >
                    Aprobar
                  </button>
                </div>
              ))}
            </div>
          )}

          {pendingCount > 0 && (
            <div style={{ borderTop: "1px solid #f3f4f6", padding: "10px 16px", textAlign: "center" }}>
              <button
                onClick={() => { router.push("/users?status=pending"); setOpen(false); }}
                style={{ background: "none", border: "none", color: "#FF751F", fontSize: "12px", fontWeight: 500, cursor: "pointer" }}
              >
                Ver todos los pendientes →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal de aprobación */}
      {approveUser && (
        <ApproveModal
          user={approveUser}
          onClose={() => setApproveUser(null)}
          onApproved={() => { setApproveUser(null); fetchNotifications(); }}
        />
      )}
    </div>
  );
}

function ApproveModal({
  user, onClose, onApproved,
}: {
  user: PendingUser;
  onClose: () => void;
  onApproved: () => void;
}) {
  const [lists, setLists]                       = useState<PriceList[]>([]);
  const [priceListId, setPriceListId]           = useState("");
  const [saphirusPriceListId, setSaphirusPriceListId] = useState("");
  const [loading, setLoading]                   = useState(false);

  useEffect(() => {
    fetch("/api/admin/price-lists")
      .then((r) => r.json())
      .then((data) => {
        const all: PriceList[] = Array.isArray(data) ? data : (data.priceLists ?? []);
        setLists(all);
      })
      .catch(() => {});
  }, []);

  const generalLists  = lists.filter((l) => l.type === "general");
  const saphirusLists = lists.filter((l) => l.type === "saphirus");

  async function handleApprove() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status:              "approved",
          priceListId:         priceListId         ? parseInt(priceListId)         : null,
          saphirusPriceListId: saphirusPriceListId ? parseInt(saphirusPriceListId) : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Error");
      onApproved();
    } catch (err: unknown) {
      alert("Error: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ background: "#fff", borderRadius: "20px", width: "100%", maxWidth: "420px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid #f3f4f6" }}>
          <span style={{ fontWeight: 700, fontSize: "16px", color: "#111827" }}>Aprobar cliente</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "20px", lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: "20px" }}>
          {/* Datos del cliente */}
          <div style={{ background: "#f9fafb", borderRadius: "12px", padding: "14px 16px", marginBottom: "16px" }}>
            <p style={{ margin: 0, fontWeight: 600, color: "#111827" }}>{user.name}</p>
            {user.company && <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6b7280" }}>{user.company}</p>}
            {user.email   && <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#9ca3af" }}>{user.email}</p>}
            {user.clientCode && <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#9ca3af" }}>Código SIPE: {user.clientCode}</p>}
          </div>

          {/* Lista general */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
              Lista de precios general
            </label>
            <select
              value={priceListId}
              onChange={(e) => setPriceListId(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: "10px", fontSize: "14px", outline: "none", background: "#fff" }}
            >
              <option value="">Sin lista (precio base)</option>
              {generalLists.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Lista Saphirus */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
              Lista Saphirus
            </label>
            <select
              value={saphirusPriceListId}
              onChange={(e) => setSaphirusPriceListId(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: "10px", fontSize: "14px", outline: "none", background: "#fff" }}
            >
              <option value="">Sin lista Saphirus</option>
              {saphirusLists.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#9ca3af" }}>Solo aplica a productos de la línea Saphirus</p>
          </div>

          {/* Botones */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={onClose}
              style={{ flex: 1, padding: "12px", border: "1px solid #e5e7eb", borderRadius: "12px", background: "#fff", color: "#6b7280", fontWeight: 500, cursor: "pointer", fontSize: "14px" }}
            >
              Cancelar
            </button>
            <button
              onClick={handleApprove}
              disabled={loading}
              style={{ flex: 1, padding: "12px", border: "none", borderRadius: "12px", background: loading ? "#fed7aa" : "#FF751F", color: "#fff", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontSize: "14px" }}
            >
              {loading ? "Aprobando..." : "✅ Aprobar cliente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
