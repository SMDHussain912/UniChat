export function ErrorBoundary({ children }) {
  return (
    <div className="app-container">
      {children}
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Loading...</p>
    </div>
  );
}

export function EmptyState({ icon, title, message }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{message}</p>
    </div>
  );
}

export function SkeletonLoader({ count = 5 }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-item" />
      ))}
    </div>
  );
}