"use client";

import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";

const WA_NUMBER = "5491100000000"; // Reemplazar con el número real de Osmar

type Props = { open: boolean; onClose: () => void };

export default function CartDrawer({ open, onClose }: Props) {
  const { items, removeItem, updateQty, total } = useCart();
  const router = useRouter();

  function handleWhatsApp() {
    const lines = items
      .map(
        (i) =>
          `• ${i.quantity}x ${i.name} — $${(i.price * i.quantity).toLocaleString("es-AR")}`
      )
      .join("\n");
    const msg = encodeURIComponent(
      `Hola! Quiero hacer un pedido:\n\n${lines}\n\n*Total: $${total.toLocaleString("es-AR")}*`
    );
    window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, "_blank");
  }

  return (
    <>
      <div
        className={`cart-overlay${open ? " open" : ""}`}
        onClick={onClose}
      />
      <div className={`cart-drawer${open ? " open" : ""}`}>
        <div className="cart-head">
          <h3>Tu carrito</h3>
          <button className="btn-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="cart-items">
          {items.length === 0 ? (
            <div className="cart-empty">
              <div className="emoji">🛒</div>
              <p>Tu carrito está vacío</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-icon">{item.emoji}</div>
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-price">
                    ${(item.price * item.quantity).toLocaleString("es-AR")} (
                    {item.quantity} × ${item.price.toLocaleString("es-AR")})
                  </div>
                  <div className="qty-ctrl">
                    <button
                      className="qty-btn"
                      onClick={() => updateQty(item.id, item.quantity - 1)}
                    >
                      −
                    </button>
                    <span className="qty-num">{item.quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => updateQty(item.id, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  className="item-remove"
                  onClick={() => removeItem(item.id)}
                  aria-label="Eliminar"
                >
                  🗑
                </button>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="cart-foot">
            <div className="cart-total">
              <span>Total</span>
              <span>${total.toLocaleString("es-AR")}</span>
            </div>
            <button className="btn-checkout" onClick={() => { onClose(); router.push("/checkout"); }}>
              Ir al checkout →
            </button>
            <button className="btn-wa" onClick={handleWhatsApp}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
              </svg>
              Pedir por WhatsApp
            </button>
          </div>
        )}
      </div>
    </>
  );
}
