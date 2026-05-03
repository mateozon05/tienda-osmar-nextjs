import { CartProvider } from "@/lib/cart";
import { ToastProvider } from "@/components/Toast";
import { FavoritesProvider } from "@/lib/favorites";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <ToastProvider>
        <FavoritesProvider>
          {children}
        </FavoritesProvider>
      </ToastProvider>
    </CartProvider>
  );
}
