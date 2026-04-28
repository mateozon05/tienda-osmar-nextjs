"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";

export type Product = {
  id: number;
  code: string;
  name: string;
  price: number;
  stock: number;
  category: { name: string; emoji: string; slug: string } | null;
};

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem({
      id: product.id,
      code: product.code,
      name: product.name,
      price: product.price,
      emoji: product.category?.emoji ?? "📦",
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 800);
  }

  return (
    <div className="product-card">
      <div className="card-img">{product.category?.emoji ?? "📦"}</div>
      <div className="card-body">
        <div className="card-cat">{product.category?.name ?? "General"}</div>
        <div className="card-name">{product.name}</div>
        <div className="card-code">Cód: {product.code}</div>
        <div className="card-footer">
          <div className="card-price">
            <small>Precio unitario</small>$
            {product.price.toLocaleString("es-AR", { minimumFractionDigits: 0 })}
          </div>
          <button
            className={`btn-add${added ? " btn-add--added" : ""}`}
            onClick={handleAdd}
            title="Agregar al carrito"
          >
            {added ? "✓" : "+"}
          </button>
        </div>
      </div>
    </div>
  );
}
