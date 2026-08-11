export function CallTimer({ duration }) {
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <span className="call-timer">
      {formatted}
    </span>
  );
}
