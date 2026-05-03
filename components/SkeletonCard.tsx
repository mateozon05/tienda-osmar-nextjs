export default function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="sk-img" />
      <div className="sk-body">
        <div className="sk-line sk-cat" />
        <div className="sk-line sk-name" />
        <div className="sk-line sk-name sk-name--short" />
        <div className="sk-line sk-code" />
        <div className="sk-footer">
          <div className="sk-price" />
          <div className="sk-btn" />
        </div>
      </div>
    </div>
  );
}
