"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type PurchaseType = "bulto" | "unidad";

export type CartItem = {
  id: number;          // product id
  code: string;
  name: string;
  price: number;       // precio efectivo según purchaseType
  quantity: number;
  emoji: string;
  purchaseType: PurchaseType;
  bulkUnit?: string;   // label del bulto, ej: "Caja"
  bulkSize?: number;   // unidades por bulto, ej: 12
};

// Clave única por ítem: mismo producto puede estar como bulto Y unidad
function cartKey(id: number, type: PurchaseType) {
  return `${id}-${type}`;
}

type CartContextType = {
  items: CartItem[];
  addItem: (product: Omit<CartItem, "quantity">) => void;
  removeItem: (id: number, purchaseType: PurchaseType) => void;
  updateQty: (id: number, purchaseType: PurchaseType, qty: number) => void;
  clearCart: () => void;
  total: number;
  count: number;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("osmar-cart");
      if (saved) setItems(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("osmar-cart", JSON.stringify(items));
  }, [items]);

  function addItem(product: Omit<CartItem, "quantity">) {
    setItems((prev) => {
      const key = cartKey(product.id, product.purchaseType);
      const existing = prev.find(
        (i) => cartKey(i.id, i.purchaseType) === key
      );
      if (existing) {
        return prev.map((i) =>
          cartKey(i.id, i.purchaseType) === key
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }

  function removeItem(id: number, purchaseType: PurchaseType) {
    setItems((prev) =>
      prev.filter((i) => cartKey(i.id, i.purchaseType) !== cartKey(id, purchaseType))
    );
  }

  function updateQty(id: number, purchaseType: PurchaseType, qty: number) {
    if (qty <= 0) {
      removeItem(id, purchaseType);
    } else {
      setItems((prev) =>
        prev.map((i) =>
          cartKey(i.id, i.purchaseType) === cartKey(id, purchaseType)
            ? { ...i, quantity: qty }
            : i
        )
      );
    }
  }

  function clearCart() {
    setItems([]);
  }

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQty, clearCart, total, count }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
}
