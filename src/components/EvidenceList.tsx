import {
  evidenceSummary,
  isUnavailableDetail,
  metricLabel,
  sourceLinkLabel,
} from "@/lib/evidence-display";
import { trendsUrl } from "@/lib/explore-links";
import type { EvidenceRow } from "@/lib/signals.functions";

function fallbackUrl(row: EvidenceRow, keyword?: string, geo?: string): string | null {
  if (row.url) return row.url;
  if (!keyword) return null;
  if (/google trends/i.test(row.source)) return trendsUrl(keyword, geo ?? "");
  if (/reddit/i.test(row.source)) {
    return `https://www.reddit.com/search/?q=${encodeURIComponent(keyword)}&sort=new`;
  }
  return null;
}

export function EvidenceList({
  rows,
  keyword,
  geo,
}: {
  rows: EvidenceRow[];
  keyword?: string;
  geo?: string;
}) {
  return (
    <ul className="mt-3 space-y-2 border-t border-dotted border-border pt-3">
      {rows.map((row, i) => {
        const href = fallbackUrl(row, keyword, geo);
        const failed = isUnavailableDetail(row.detail);
        const summary = evidenceSummary(row);
        return (
          <li
            key={`${row.metric}-${i}`}
            className="rounded-md border border-border bg-muted/50 px-3 py-2.5"
          >
            <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
                {row.source}
                <span className="font-medium text-muted-foreground">
                  {" · "}
                  {metricLabel(row.metric)}
                </span>
              </span>
              {row.value !== null ? (
                <span className="font-display text-base font-semibold tabular-nums text-primary">
                  {row.value}
                </span>
              ) : null}
            </p>
            <p
              className={`mt-1 text-[13px] leading-5 ${
                failed ? "text-muted-foreground" : "text-foreground"
              }`}
            >
              {summary}
            </p>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block font-mono text-[10px] uppercase tracking-[0.14em] text-primary underline-offset-2 hover:underline"
              >
                {sourceLinkLabel(row.source)} ↗
              </a>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
