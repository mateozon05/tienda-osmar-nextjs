"use client";

import { useEffect, useState } from "react";

interface PriceList {
  id: number;
  name: string;
  type: string;
  description: string | null;
  discountPercentage: number | null;
  isDefault: boolean;
  isActive: boolean;
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        border: "4px solid #FED7AA", borderTopColor: "#FF751F",
        animation: "spin 0.75s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ListCard({ pl }: { pl: PriceList }) {
  const isSaphirus = pl.type === "saphirus";
  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${isSaphirus ? "#BBF7D0" : "#E5E7EB"}`,
      borderRadius: 12,
      padding: "16px 20px",
      display: "flex",
      alignItems: "center",
      gap: 14,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: isSaphirus ? "#F0FDF4" : "#FFF7ED",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, flexShrink: 0,
      }}>
        {isSaphirus ? "🟢" : "🏷️"}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{pl.name}</div>
        {pl.description && (
          <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{pl.description}</div>
        )}
        {pl.discountPercentage != null && pl.discountPercentage > 0 && (
          <div style={{ fontSize: 12, color: "#FF751F", marginTop: 2 }}>
            Descuento: {pl.discountPercentage}%
          </div>
        )}
      </div>
      <div style={{
        fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
        background: isSaphirus ? "#DCFCE7" : "#FEF3C7",
        color: isSaphirus ? "#15803D" : "#B45309",
      }}>
        {isSaphirus ? "SAPHIRUS" : "GENERAL"}
      </div>
      <div style={{
        fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
        background: "#F0F9FF", color: "#0369A1",
      }}>
        ID {pl.id}
      </div>
    </div>
  );
}

export default function PriceListsPage() {
  const [lists,   setLists]   = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    fetch("/api/admin/price-lists")
      .then((r) => r.json())
      .then((d) => setLists(d.priceLists ?? []))
      .catch(() => setError("Error al cargar listas"))
      .finally(() => setLoading(false));
  }, []);

  const generalLists  = lists.filter((pl) => pl.type === "general");
  const saphirusLists = lists.filter((pl) => pl.type === "saphirus");

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 }}>
          🏷️ Listas de Precios
        </h1>
        <p style={{ color: "#6B7280", marginTop: 6, fontSize: 14 }}>
          {lists.length > 0
            ? `${lists.length} listas configuradas · Asignalas a clientes desde /usuarios o /clientes`
            : "Las listas se crean automáticamente al ejecutar el script de importación de precios"}
        </p>
      </div>

      {loading && <Spinner />}
      {error   && <div style={{ color: "#DC2626", padding: 16 }}>{error}</div>}

      {!loading && !error && lists.length === 0 && (
        <div style={{
          background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12,
          padding: "24px 28px", color: "#92400E",
        }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>⚠️ No hay listas de precios</div>
          <p style={{ margin: 0, fontSize: 14 }}>
            Ejecutá el script de importación para crear las listas desde el Excel de SIPE:
          </p>
          <code style={{
            display: "block", marginTop: 12, background: "#FEF3C7",
            padding: "10px 14px", borderRadius: 8, fontSize: 13, wordBreak: "break-all",
          }}>
            npm run import:prices -- &quot;C:/Users/MATEOZON/Desktop/exportacion__5_.xlsx&quot;
          </code>
        </div>
      )}

      {!loading && generalLists.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#374151", margin: 0 }}>
              Listas Generales
            </h2>
            <span style={{
              fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 20,
              background: "#FEF3C7", color: "#B45309",
            }}>
              {generalLists.length}
            </span>
            <span style={{ fontSize: 13, color: "#9CA3AF" }}>
              — Para todos los productos que no son Saphirus
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {generalLists.map((pl) => <ListCard key={pl.id} pl={pl} />)}
          </div>
        </section>
      )}

      {!loading && saphirusLists.length > 0 && (
        <section>
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#374151", margin: 0 }}>
              Listas Saphirus
            </h2>
            <span style={{
              fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 20,
              background: "#DCFCE7", color: "#15803D",
            }}>
              {saphirusLists.length}
            </span>
            <span style={{ fontSize: 13, color: "#9CA3AF" }}>
              — Solo para los 781 productos de la marca Saphirus
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {saphirusLists.map((pl) => <ListCard key={pl.id} pl={pl} />)}
          </div>
        </section>
      )}

      {!loading && lists.length > 0 && (
        <div style={{
          marginTop: 32, padding: "16px 20px",
          background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 12,
          fontSize: 13, color: "#075985",
        }}>
          <strong>💡 Cómo funciona:</strong> Cada cliente puede tener una lista general (Mayorista o 30 Días)
          y/o una lista Saphirus. El precio que ve en la tienda es el de su lista asignada.
          Si no tiene lista asignada, ve el precio base del producto.
        </div>
      )}
    </div>
  );
}
