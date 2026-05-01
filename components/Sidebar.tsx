"use client";

export type Category = {
  id: number;
  name: string;
  slug: string;
  emoji: string;
  _count: { products: number };
};

type Props = {
  categories: Category[];
  active: string;
  onSelect: (slug: string) => void;
  /** Mobile: whether the sidebar drawer is open */
  mobileOpen?: boolean;
  /** Mobile: called when backdrop or close btn is clicked */
  onMobileClose?: () => void;
};

export default function Sidebar({ categories, active, onSelect, mobileOpen, onMobileClose }: Props) {
  const visibleCats = categories.filter((c) => c.slug !== "todos" && c._count.products > 0);
  const allCount = visibleCats.reduce((s, c) => s + c._count.products, 0);

  function handleSelect(slug: string) {
    onSelect(slug);
    onMobileClose?.();
  }

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={onMobileClose} aria-hidden="true" />
      )}

      <aside className={`site-sidebar${mobileOpen ? " mobile-open" : ""}`}>
        {/* Mobile close button */}
        <div className="sidebar-mobile-head">
          <span className="side-title" style={{ marginBottom: 0 }}>Categorías</span>
          <button className="sidebar-close-btn" onClick={onMobileClose} aria-label="Cerrar menú">
            ✕
          </button>
        </div>

        <div className="side-title side-title--desktop">Categorías</div>

        <button
          className={`cat-btn${active === "todos" ? " active" : ""}`}
          onClick={() => handleSelect("todos")}
        >
          <span className="cat-icon">🏠</span>
          Todos
          <span className="cat-count">{allCount}</span>
        </button>

        {visibleCats.map((cat) => (
          <button
            key={cat.id}
            className={`cat-btn${active === cat.slug ? " active" : ""}`}
            onClick={() => handleSelect(cat.slug)}
          >
            <span className="cat-icon">{cat.emoji}</span>
            {cat.name}
            <span className="cat-count">{cat._count.products}</span>
          </button>
        ))}
      </aside>
    </>
  );
}
