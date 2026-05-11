"use client";

type Props = {
  categoryName?: string;
  query?: string;
  onHome: () => void;
};

export default function Breadcrumb({ categoryName, query, onHome }: Props) {
  if (!categoryName && !query) return null;

  return (
    <nav className="breadcrumb" aria-label="Navegación">
      <button className="bc-link" onClick={onHome}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9,22 9,12 15,12 15,22"/>
        </svg>
        Inicio
      </button>

      {categoryName && (
        <>
          <span className="bc-sep">›</span>
          <span className="bc-active">{categoryName}</span>
        </>
      )}

      {query && (
        <>
          <span className="bc-sep">›</span>
          <span className="bc-active">"{query}"</span>
        </>
      )}
    </nav>
  );
}
