export function ConnectionIndicator({ quality }) {
  const colors = {
    good: '#4ade80',
    fair: '#facc15',
    poor: '#f87171'
  };

  return (
    <span className="connection-indicator" style={{ color: colors[quality] || colors.good }}>
      ● {quality}
    </span>
  );
}
