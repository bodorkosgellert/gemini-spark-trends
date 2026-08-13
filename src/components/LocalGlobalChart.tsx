import { seriesDelta, sparklinePoints } from "@/lib/series";

type Props = {
  localLabel: string;
  localSeries: number[];
  globalSeries: number[];
};

function asNumbers(series: unknown): number[] {
  if (!Array.isArray(series)) return [];
  return series.map((v) => Number(v)).filter((v) => Number.isFinite(v));
}

/**
 * Two measured interest curves. Each Google Trends line is indexed to its own
 * peak, so this is a timing / %-change comparison, not an intensity gauge.
 */
export function LocalGlobalChart({ localLabel, localSeries, globalSeries }: Props) {
  const local = asNumbers(localSeries);
  const worldwide = asNumbers(globalSeries);
  if (local.length < 8 || worldwide.length < 8) return null;

  const localDelta = seriesDelta(local);
  const globalDelta = seriesDelta(worldwide);
  const localPoints = sparklinePoints(local);
  const globalPoints = sparklinePoints(worldwide);

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {localLabel} vs global
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          <span className="text-primary">{localLabel}</span>
          {localDelta ? ` ${localDelta.pct > 0 ? "+" : ""}${localDelta.pct}%` : ""}
          {" · "}
          <span>Global</span>
          {globalDelta ? ` ${globalDelta.pct > 0 ? "+" : ""}${globalDelta.pct}%` : ""}
        </p>
      </div>
      <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="mt-1 h-8 w-full" aria-hidden>
        <polyline
          points={globalPoints}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeDasharray="2 2"
          className="text-muted-foreground"
        />
        <polyline points={localPoints} fill="none" stroke="var(--heat-4)" strokeWidth="1.6" />
      </svg>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        Same shape scale, own peaks — compare timing, not height
      </p>
    </div>
  );
}
