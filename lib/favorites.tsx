"use client";

import {
  createContext, useContext, useState, useEffect, useCallback, ReactNode
} from "react";
import type { Product } from "@/components/ProductCard";

// ── Types ──────────────────────────────────────────────────
type FavCtx = {
  favorites: Product[];
  count: number;
  isFavorite: (id: number) => boolean;
  toggle: (product: Product) => void;
  clear: () => void;
};

const FavContext = createContext<FavCtx | null>(null);

const STORAGE_KEY = "osmar-favorites";

// ── Provider ───────────────────────────────────────────────
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Product[]>([]);

  // Hydrate from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch {}
  }, []);

  // Persist whenever favorites change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const isFavorite = useCallback((id: number) =>
    favorites.some(p => p.id === id), [favorites]);

  const toggle = useCallback((product: Product) => {
    setFavorites(prev =>
      prev.some(p => p.id === product.id)
        ? prev.filter(p => p.id !== product.id)
        : [...prev, product]
    );
  }, []);

  const clear = useCallback(() => setFavorites([]), []);

  return (
    <FavContext.Provider value={{ favorites, count: favorites.length, isFavorite, toggle, clear }}>
      {children}
    </FavContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────
export function useFavorites() {
  const ctx = useContext(FavContext);
  if (!ctx) throw new Error("useFavorites fuera de FavoritesProvider");
  return ctx;
}
