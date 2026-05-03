import { CartProvider } from "@/lib/cart";
import { ToastProvider } from "@/components/Toast";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </CartProvider>
  );
}
