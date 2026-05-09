"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/dashboard",  label: "Dashboard",    icon: "📊" },
  { href: "/orders",     label: "Órdenes",       icon: "📦" },
  { href: "/products",   label: "Productos",     icon: "🏷️" },
  { href: "/users",      label: "Usuarios",      icon: "👤" },
  { href: "/audit",      label: "Auditoría",     icon: "🛡️" },
  { href: "/settings",   label: "Configuración", icon: "⚙️" },
];

// SVG icons (no lucide-react dependency)
function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="3" y1="6"  x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6"  y1="6" x2="18" y2="18"/>
    </svg>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  function closeDrawer() { setDrawerOpen(false); }

  return (
    <>
      {/* ════════════════════════════════════════
          DESKTOP SIDEBAR — hidden on mobile
      ════════════════════════════════════════ */}
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
              className={`admin-nav-item${isActive(item.href) ? " active" : ""}`}
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

      {/* ════════════════════════════════════════
          MOBILE TOP BAR — visible only on mobile
      ════════════════════════════════════════ */}
      <div className="admin-mobile-topbar">
        <div className="admin-mobile-topbar-title">
          🧹 Osmar Admin
        </div>
        <button
          className="admin-hamburger"
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menú"
        >
          <IconMenu />
        </button>
      </div>

      {/* ════════════════════════════════════════
          MOBILE DRAWER OVERLAY
      ════════════════════════════════════════ */}
      <div
        className={`admin-drawer-overlay${drawerOpen ? " open" : ""}`}
        onClick={closeDrawer}
      />

      {/* ════════════════════════════════════════
          MOBILE DRAWER PANEL
      ════════════════════════════════════════ */}
      <div className={`admin-drawer${drawerOpen ? " open" : ""}`}>

        {/* Drawer header */}
        <div className="admin-drawer-head">
          <div className="admin-drawer-head-title">
            🧹 Panel Admin
          </div>
          <button className="admin-drawer-close" onClick={closeDrawer} aria-label="Cerrar menú">
            <IconClose />
          </button>
        </div>

        {/* Nav links */}
        <nav className="admin-drawer-nav">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeDrawer}
              className={`admin-drawer-link${isActive(item.href) ? " active" : ""}`}
            >
              <span className="admin-drawer-link-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="admin-drawer-foot">
          <Link href="/" onClick={closeDrawer} className="admin-drawer-shop-link">
            <span>🛍️</span>
            Ver tienda
          </Link>
          <button className="admin-drawer-logout-btn" onClick={handleLogout}>
            <span>🚪</span>
            Cerrar sesión
          </button>
        </div>

      </div>
    </>
  );
}
