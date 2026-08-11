/**
 * Blue heat scale: colour intensity carries meaning.
 * Fresher signals (fewer days since last movement) render as deeper,
 * more saturated blue; stale ones fade toward pale blue-grey.
 */
export const HEAT_STEPS = [
  "var(--heat-1)",
  "var(--heat-2)",
  "var(--heat-3)",
  "var(--heat-4)",
  "var(--heat-5)",
] as const;

/** 0 = coldest, 4 = hottest */
export function heatIndexFromDays(days: number): number {
  if (days <= 1) return 4;
  if (days <= 3) return 3;
  if (days <= 7) return 2;
  if (days <= 21) return 1;
  return 0;
}

export function heatIndexFromScore(score: number): number {
  if (score >= 80) return 4;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  if (score >= 20) return 1;
  return 0;
}

export function heatColor(index: number): string {
  return HEAT_STEPS[Math.max(0, Math.min(4, index))] ?? HEAT_STEPS[0];
}

export function heatStyle(index: number): React.CSSProperties {
  const i = Math.max(0, Math.min(4, index));
  const step = HEAT_STEPS[i] ?? HEAT_STEPS[0];
  return {
    backgroundColor: `color-mix(in oklab, ${step} ${18 + i * 18}%, white)`,
    color: i >= 3 ? "var(--heat-5)" : "var(--foreground)",
    borderColor: `color-mix(in oklab, ${step} 55%, white)`,
  };
}

export const HEAT_LEGEND = [
  { label: "22d+", index: 0 },
  { label: "8–21d", index: 1 },
  { label: "4–7d", index: 2 },
  { label: "2–3d", index: 3 },
  { label: "today", index: 4 },
];