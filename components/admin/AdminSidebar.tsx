"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// Items para todos los admins
const NAV = [
  { href: "/dashboard",        label: "Dashboard",  icon: "📊",  exact: false },
  { href: "/orders",           label: "Órdenes",    icon: "📦",  exact: false },
  { href: "/products",         label: "Productos",  icon: "🏷️", exact: true  },
  { href: "/products/images",  label: "Imágenes",   icon: "🖼️", exact: false },
  { href: "/users",            label: "Usuarios",   icon: "👤",  exact: false },
  { href: "/audit",            label: "Auditoría",  icon: "🛡️", exact: false },
];

// Items exclusivos de superadmin
const SUPERADMIN_NAV = [
  { href: "/admins",   label: "Administradores", icon: "👑" },
  { href: "/settings", label: "Configuración",   icon: "⚙️" },
];

// SVG icons
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

export default function AdminSidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isSuperAdmin = role === "superadmin";

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  function closeDrawer() { setDrawerOpen(false); }

  const roleBadge = isSuperAdmin
    ? <span className="admin-role-badge admin-role-badge--super">👑 Superadmin</span>
    : <span className="admin-role-badge">⚙️ Admin</span>;

  return (
    <>
      {/* ════════════════════════════════════════
          DESKTOP SIDEBAR
      ════════════════════════════════════════ */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-icon">🧹</div>
          <div>
            <div className="admin-brand-name">Osmar Admin</div>
            <div className="admin-brand-sub">Panel de control</div>
          </div>
        </div>

        {/* Role badge desktop */}
        <div style={{ padding: "0 12px 8px" }}>{roleBadge}</div>

        <nav className="admin-nav">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-nav-item${isActive(item.href, item.exact) ? " active" : ""}`}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          {/* Superadmin-only section */}
          {isSuperAdmin && (
            <>
              <div className="admin-nav-divider">
                <span>Superadmin</span>
              </div>
              {SUPERADMIN_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-nav-item admin-nav-item--super${isActive(item.href) ? " active" : ""}`}
                >
                  <span className="admin-nav-icon">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        <div className="admin-sidebar-footer">
          <Link href="/" className="admin-store-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <path d="M9 22V12h6v10"/>
            </svg>
            Ver tienda
          </Link>
          <button className="admin-logout" onClick={handleLogout}>
            <span>🚪</span> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ════════════════════════════════════════
          MOBILE TOP BAR
      ════════════════════════════════════════ */}
      <div className="admin-mobile-topbar">
        <div className="admin-mobile-topbar-title">
          {isSuperAdmin ? "👑" : "🧹"} Osmar Admin
        </div>
        <div className="admin-topbar-actions">
          <Link href="/" className="admin-topbar-store-btn" title="Ver tienda" aria-label="Ver tienda">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <path d="M9 22V12h6v10"/>
            </svg>
          </Link>
          <button
            className="admin-hamburger"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
          >
            <IconMenu />
          </button>
        </div>
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

        <div className="admin-drawer-head">
          <div className="admin-drawer-head-title">
            {isSuperAdmin ? "👑" : "🧹"} Panel Admin
          </div>
          <button className="admin-drawer-close" onClick={closeDrawer} aria-label="Cerrar menú">
            <IconClose />
          </button>
        </div>

        {/* Role badge mobile */}
        <div style={{ padding: "0 16px 8px" }}>{roleBadge}</div>

        <nav className="admin-drawer-nav">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeDrawer}
              className={`admin-drawer-link${isActive(item.href, item.exact) ? " active" : ""}`}
            >
              <span className="admin-drawer-link-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          {isSuperAdmin && (
            <>
              <div className="admin-nav-divider admin-nav-divider--drawer">
                <span>Superadmin</span>
              </div>
              {SUPERADMIN_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeDrawer}
                  className={`admin-drawer-link admin-drawer-link--super${isActive(item.href) ? " active" : ""}`}
                >
                  <span className="admin-drawer-link-icon">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </nav>

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
