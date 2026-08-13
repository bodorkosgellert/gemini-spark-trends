import type { EvidenceRow } from "@/lib/signals.functions";

export function isUnavailableDetail(detail: string): boolean {
  return /^\s*unavailable:/i.test(detail);
}

export function metricLabel(metric: string): string {
  return metric.replace(/_/g, " ");
}

export function sourceLinkLabel(source: string): string {
  if (/google trends/i.test(source)) return "Open Google Trends";
  if (/reddit/i.test(source)) return "Open Reddit search";
  if (/github/i.test(source)) return "Open GitHub search";
  if (/hacker news/i.test(source)) return "Open Hacker News";
  if (/dataforseo/i.test(source)) return "About this reading";
  if (/app store/i.test(source)) return "Open App Store search";
  if (/wikipedia/i.test(source)) return "Open Wikipedia";
  if (/tavily/i.test(source)) return "Open source article";
  return "Open source";
}

/** Strip parser / HTTP junk so Radar never uses an error blob as link text. */
export function evidenceSummary(row: Pick<EvidenceRow, "source" | "detail">): string {
  if (!isUnavailableDetail(row.detail)) return row.detail;
  if (/google trends/i.test(row.source)) {
    return "Automated pull was blocked. The explore link still opens the live chart.";
  }
  if (/reddit/i.test(row.source)) {
    return "Reddit blocks automated counts. The search link still works.";
  }
  return "This source could not be counted automatically.";
}

export function parseTrendsPayload(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("<") || /<html/i.test(trimmed.slice(0, 280))) {
    throw new Error("Google blocked the automated pull");
  }
  const json = trimmed.replace(/^\)\]\}'\n?/, "");
  try {
    return JSON.parse(json);
  } catch {
    throw new Error("Google blocked the automated pull");
  }
}
