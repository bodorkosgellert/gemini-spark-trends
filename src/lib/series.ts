/** Shared sparkline math. Never invent points — only reduce a measured series. */

export function seriesDelta(series: number[]): { pct: number; label: string } | null {
  if (series.length < 8) return null;
  const recent = series.slice(-4);
  const prior = series.slice(0, -4);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const r = mean(recent);
  const p = mean(prior);
  if (p <= 0.5) return null;
  const pct = Math.round(((r - p) / p) * 100);
  const label =
    pct > 0 ? `+${pct}% vs earlier` : pct < 0 ? `${pct}% vs earlier` : "flat vs earlier";
  return { pct, label };
}

export function sparklinePoints(series: number[], width = 100, height = 26, pad = 2): string {
  if (series.length < 2) return "";
  const max = Math.max(...series, 1);
  const min = Math.min(...series, 0);
  const span = Math.max(max - min, 1);
  return series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * width;
      const y = height - pad - ((v - min) / span) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");
}
