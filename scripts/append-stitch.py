css = """
/* ══════════════════════════════════════════════════════════════
   STITCH DESIGN SYSTEM - stitch-design-test branch
══════════════════════════════════════════════════════════════ */

/* ── 1. Design tokens ──────────────────────────────────────── */
:root {
  --stitch-primary:        #FF8235;
  --stitch-primary-dark:   #9d4400;
  --stitch-secondary:      #1A1C2E;
  --stitch-tertiary:       #24BD57;
  --stitch-surface:        #F5F5F7;
  --stitch-surface-bright: #FFFFFF;
  --stitch-on-surface:     #191C1D;
  --stitch-outline:        #8B7266;
  --stitch-error:          #BA1A1A;
  --stitch-shadow-sm: 0 1px 3px rgba(26,28,46,.04), 0 1px 2px rgba(26,28,46,.06);
  --stitch-shadow-md: 0 4px 12px rgba(26,28,46,.07), 0 2px 4px rgba(26,28,46,.05);
  --stitch-shadow-lg: 0 8px 24px rgba(26,28,46,.10), 0 4px 8px rgba(26,28,46,.06);
  --stitch-radius-xs: .25rem;
  --stitch-radius-sm: .5rem;
  --stitch-radius:    .75rem;
  --stitch-radius-lg: 1.25rem;
  --stitch-radius-xl: 1.75rem;
}

/* ── 2. Typography classes ─────────────────────────────────── */
.stitch-display-xl  { font-family:var(--font-epilogue),sans-serif; font-size:clamp(40px,6vw,64px); font-weight:700; line-height:1.08; letter-spacing:-.02em; }
.stitch-headline-lg { font-family:var(--font-epilogue),sans-serif; font-size:clamp(24px,3vw,32px); font-weight:600; line-height:1.25; }
.stitch-headline-md { font-family:var(--font-epilogue),sans-serif; font-size:22px; font-weight:600; line-height:1.35; }
.stitch-headline-sm { font-family:var(--font-epilogue),sans-serif; font-size:18px; font-weight:600; line-height:1.4; }
.stitch-body-lg     { font-family:var(--font-manrope),sans-serif; font-size:18px; font-weight:400; line-height:1.65; }
.stitch-body-md     { font-family:var(--font-manrope),sans-serif; font-size:15px; font-weight:400; line-height:1.6; }
.stitch-label-lg    { font-family:var(--font-manrope),sans-serif; font-size:12px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; }

/* ── 3. Header ─────────────────────────────────────────────── */
.site-header { background:var(--stitch-secondary) !important; box-shadow:var(--stitch-shadow-md) !important; border-bottom:none !important; }
.site-header .logo-name,
.site-header .logo-tagline  { color:#FFFFFF !important; }
.site-header .search-wrap input {
  background:rgba(255,255,255,.10) !important; border-color:rgba(255,255,255,.18) !important;
  color:#fff !important; border-radius:var(--stitch-radius) !important;
}
.site-header .search-wrap input::placeholder { color:rgba(255,255,255,.45) !important; }
.site-header .search-wrap input:focus { background:rgba(255,255,255,.16) !important; border-color:var(--stitch-primary) !important; }
.site-header .search-icon  { color:rgba(255,255,255,.55) !important; }
.site-header .search-clear { color:rgba(255,255,255,.55) !important; }
.site-header .search-clear:hover { color:#fff !important; }
.btn-login { background:var(--stitch-primary) !important; color:#fff !important; border-radius:var(--stitch-radius) !important; font-family:var(--font-manrope),sans-serif !important; font-weight:600 !important; border:none !important; box-shadow:0 2px 8px rgba(255,130,53,.35) !important; }
.btn-login:hover { background:var(--stitch-primary-dark) !important; }
.btn-cart { background:rgba(255,255,255,.10) !important; color:#fff !important; border:1.5px solid rgba(255,255,255,.20) !important; border-radius:var(--stitch-radius) !important; }
.btn-cart:hover { background:rgba(255,255,255,.18) !important; border-color:var(--stitch-primary) !important; }
.cart-badge { background:var(--stitch-primary) !important; }
.btn-fav-link { color:rgba(255,255,255,.75) !important; }
.btn-fav-link:hover { color:var(--stitch-primary) !important; }
.fav-header-badge { background:var(--stitch-primary) !important; }
.user-name  { color:rgba(255,255,255,.85) !important; }
.btn-logout { color:rgba(255,255,255,.55) !important; font-size:12px !important; }
.btn-logout:hover { color:#fff !important; }
.btn-hamburger { color:rgba(255,255,255,.80) !important; }
.btn-hamburger:hover { color:#fff !important; }

/* ── 4. Page background ────────────────────────────────────── */
.shop-layout, .shop-main, body { background:var(--stitch-surface) !important; }

/* ── 5. Sidebar ────────────────────────────────────────────── */
.sidebar { background:var(--stitch-surface-bright) !important; border-radius:var(--stitch-radius-lg) !important; box-shadow:var(--stitch-shadow-sm) !important; border:1px solid rgba(26,28,46,.07) !important; }
.cat-btn.active { background:var(--stitch-primary) !important; color:#fff !important; border-radius:var(--stitch-radius-sm) !important; }
.cat-btn:hover:not(.active) { background:rgba(255,130,53,.08) !important; color:var(--stitch-primary) !important; }

/* ── 6. Product cards ──────────────────────────────────────── */
.product-card { background:var(--stitch-surface-bright) !important; border-radius:var(--stitch-radius-lg) !important; box-shadow:var(--stitch-shadow-sm) !important; border:1px solid rgba(26,28,46,.06) !important; transition:box-shadow .20s ease,transform .20s ease !important; }
.product-card:hover { box-shadow:var(--stitch-shadow-lg) !important; transform:translateY(-3px) !important; border-color:rgba(255,130,53,.20) !important; }
.card-img { border-radius:var(--stitch-radius-lg) var(--stitch-radius-lg) 0 0 !important; background:var(--stitch-surface) !important; }
.card-cat  { font-family:var(--font-manrope),sans-serif !important; font-size:10.5px !important; font-weight:700 !important; letter-spacing:.06em !important; text-transform:uppercase !important; color:var(--stitch-primary) !important; }
.card-name { font-family:var(--font-epilogue),sans-serif !important; font-weight:600 !important; color:var(--stitch-on-surface) !important; }
.card-price { color:var(--stitch-primary) !important; font-family:var(--font-epilogue),sans-serif !important; font-weight:700 !important; }
.card-price small { color:var(--stitch-outline) !important; font-family:var(--font-manrope),sans-serif !important; }
.btn-add { background:var(--stitch-primary) !important; border-radius:var(--stitch-radius-sm) !important; box-shadow:0 2px 8px rgba(255,130,53,.30) !important; border:none !important; transition:background .15s,transform .12s !important; }
.btn-add:hover:not(:disabled) { background:var(--stitch-primary-dark) !important; transform:scale(1.08) !important; }
.btn-add--added { background:var(--stitch-tertiary) !important; box-shadow:0 2px 8px rgba(36,189,87,.30) !important; }
.card-type-btn { border-radius:var(--stitch-radius-xs) !important; font-family:var(--font-manrope),sans-serif !important; font-size:11px !important; font-weight:600 !important; }
.card-type-btn--active { background:var(--stitch-primary) !important; color:#fff !important; border-color:var(--stitch-primary) !important; }

/* ── 7. Skeleton + pagination ──────────────────────────────── */
.skeleton-card { background:var(--stitch-surface-bright) !important; border-radius:var(--stitch-radius-lg) !important; box-shadow:var(--stitch-shadow-sm) !important; }
.page-btn { border-radius:var(--stitch-radius-sm) !important; font-family:var(--font-manrope),sans-serif !important; font-weight:600 !important; border:1.5px solid rgba(26,28,46,.12) !important; background:var(--stitch-surface-bright) !important; box-shadow:var(--stitch-shadow-sm) !important; }
.page-btn:hover:not(:disabled) { border-color:var(--stitch-primary) !important; color:var(--stitch-primary) !important; }
.page-btn--active { background:var(--stitch-primary) !important; color:#fff !important; border-color:var(--stitch-primary) !important; box-shadow:0 2px 8px rgba(255,130,53,.30) !important; }

/* ── 8. Cart / Checkout ────────────────────────────────────── */
.cart-title { font-family:var(--font-epilogue),sans-serif !important; font-weight:700 !important; }
.btn-pay { background:var(--stitch-primary) !important; border-radius:var(--stitch-radius) !important; font-family:var(--font-manrope),sans-serif !important; font-weight:700 !important; box-shadow:0 4px 16px rgba(255,130,53,.35) !important; border:none !important; }
.btn-pay:hover:not(:disabled) { background:var(--stitch-primary-dark) !important; }

/* ── 9. Modals ─────────────────────────────────────────────── */
.modal  { border-radius:var(--stitch-radius-xl) !important; box-shadow:var(--stitch-shadow-lg) !important; }
.pm-wrap { border-radius:var(--stitch-radius-xl) !important; }
.pm-name { font-family:var(--font-epilogue),sans-serif !important; font-weight:700 !important; color:var(--stitch-on-surface) !important; }
.pm-price-val { color:var(--stitch-primary) !important; font-family:var(--font-epilogue),sans-serif !important; font-weight:700 !important; }

/* ── 10. Toast ─────────────────────────────────────────────── */
.toast { border-radius:var(--stitch-radius) !important; box-shadow:var(--stitch-shadow-lg) !important; font-family:var(--font-manrope),sans-serif !important; }

/* ── 11. Empty state ───────────────────────────────────────── */
.empty-state-title { font-family:var(--font-epilogue),sans-serif !important; color:var(--stitch-on-surface) !important; }
.empty-state-cta   { background:var(--stitch-primary) !important; border-radius:var(--stitch-radius) !important; font-family:var(--font-manrope),sans-serif !important; font-weight:700 !important; }
.empty-state-cta:hover { background:var(--stitch-primary-dark) !important; }

/* ── 12. Footer ────────────────────────────────────────────── */
.site-footer { background:var(--stitch-secondary) !important; }
"""

with open(r'C:\Users\MATEOZON\Desktop\DO\TIENDA WEB\tienda-osmar-nextjs\app\globals.css', 'a', encoding='utf-8') as f:
    f.write(css)
print('Stitch CSS appended OK')
