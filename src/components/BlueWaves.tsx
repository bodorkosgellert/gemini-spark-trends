/**
 * Layered sine curves in blue. Line opacity deepens toward the crest,
 * echoing the heat scale used across the app.
 */
export function BlueWaves({ className = "" }: { className?: string }) {
  const lines = Array.from({ length: 26 }, (_, i) => i);
  const path = (offset: number) => {
    const a = 60 - offset * 0.9;
    const y = 220 + offset * 7;
    return `M0 ${y} C 200 ${y - a}, 320 ${y + a}, 520 ${y} S 840 ${y - a * 1.4}, 1040 ${y - a * 0.3} S 1360 ${y + a}, 1600 ${y - a * 0.8}`;
  };
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1600 520"
      preserveAspectRatio="none"
      className={`pointer-events-none select-none ${className}`}
    >
      <g className="wave-drift">
        {lines.map((i) => (
          <path
            key={i}
            d={path(i)}
            fill="none"
            stroke={`var(--heat-${Math.min(5, Math.max(1, 5 - Math.floor(i / 6)))})`}
            strokeWidth={0.9}
            opacity={0.55 - i * 0.012}
          />
        ))}
      </g>
    </svg>
  );
}