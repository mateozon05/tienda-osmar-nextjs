"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/dashboard",  label: "Dashboard",    icon: "📊" },
  { href: "/orders",     label: "Órdenes",       icon: "📦" },
  { href: "/products",   label: "Productos",     icon: "🏷️" },
  { href: "/users",      label: "Usuarios",      icon: "👤" },
  { href: "/settings",   label: "Configuración", icon: "⚙️" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <div className="admin-brand-icon">🧹</div>
        <div>
          <div className="admin-brand-name">Osmar Admin</div>
          <div className="admin-brand-sub">Panel de control</div>
        </div>
      </div>

      <nav className="admin-nav">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`admin-nav-item${pathname === item.href || pathname.startsWith(item.href + "/") ? " active" : ""}`}
          >
            <span className="admin-nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <Link href="/" className="admin-nav-item" style={{ fontSize: 13 }}>
          <span className="admin-nav-icon">🛍️</span>
          Ver tienda
        </Link>
        <button className="admin-logout" onClick={handleLogout}>
          <span>🚪</span> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
