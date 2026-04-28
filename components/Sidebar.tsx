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
};

export default function Sidebar({ categories, active, onSelect }: Props) {
  const visibleCats = categories.filter((c) => c.slug !== "todos");
  const allCount = visibleCats.reduce((s, c) => s + c._count.products, 0);

  return (
    <aside className="site-sidebar">
      <div className="side-title">Categorías</div>

      <button
        className={`cat-btn${active === "todos" ? " active" : ""}`}
        onClick={() => onSelect("todos")}
      >
        <span className="cat-icon">🏠</span>
        Todos
        <span className="cat-count">{allCount}</span>
      </button>

      {visibleCats.map((cat) => (
        <button
          key={cat.id}
          className={`cat-btn${active === cat.slug ? " active" : ""}`}
          onClick={() => onSelect(cat.slug)}
        >
          <span className="cat-icon">{cat.emoji}</span>
          {cat.name}
          <span className="cat-count">{cat._count.products}</span>
        </button>
      ))}
    </aside>
  );
}
