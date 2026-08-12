import gapsFile from "@/data/ai-citation-gaps.json";

export type AiGapLevel = "high" | "medium" | "low";

/** Shape of the citation set — `gap` alone collapses two states that mean opposite things.
 *  none = AI names no product at all (ambiguous: whitespace, or a category that does not exist commercially)
 *  fragmented = several brands, none repeating across engines (strongest signal: demand exists, no winner)
 *  dominated = 1-2 brands cited consistently (category is settled) */
export type CitationShape = "none" | "fragmented" | "dominated";

/** What the AI answers *with* when it has no product to name. */
export type AnswerType = "product" | "directory" | "advice" | "hardware";

export type AiCitationGap = {
  slug: string;
  keyword: string;
  gap: AiGapLevel;
  status: "demo" | "sitefire";
  prompt: string;
  cited: string[];
  localCited: boolean;
  note: string;
  /** Fields below are optional so Sitefire rows can be merged in progressively. */
  citationShape?: CitationShape;
  answerType?: AnswerType;
  engines?: string[];
  engineDisagreement?: boolean;
};

const gaps = (gapsFile as { gaps: AiCitationGap[] }).gaps;

const bySlug = new Map(gaps.map((g) => [g.slug, g]));
const byKeyword = new Map(gaps.map((g) => [g.keyword.toLowerCase(), g]));

export function getAiCitationGap(slug: string, keyword?: string): AiCitationGap | null {
  return bySlug.get(slug) ?? (keyword ? byKeyword.get(keyword.toLowerCase()) ?? null : null) ?? null;
}

export function listAiCitationGaps(): AiCitationGap[] {
  return gaps;
}

export function gapLabel(gap: AiGapLevel): string {
  if (gap === "high") return "AI gap high";
  if (gap === "medium") return "AI gap mid";
  return "AI gap low";
}

export function shapeLabel(shape: CitationShape): string {
  if (shape === "none") return "no product cited";
  if (shape === "fragmented") return "no clear winner";
  return "winner cited";
}

/** Why a gap is interesting depends on how crowded the shelf already is.
 *  Absent AI citations do NOT mean absent competitors — a category can have 50 App Store
 *  apps and still be invisible to AI, which is a distribution gap, not a supply gap. */
export type GapStory = "whitespace" | "geo-arbitrage" | "crowded";

export function gapStory(gap: AiGapLevel, supplyScore: number): GapStory | null {
  if (gap === "low") return null;
  return supplyScore >= 40 ? "geo-arbitrage" : "whitespace";
}

export function gapStoryLabel(story: GapStory): string {
  if (story === "whitespace") return "whitespace · nobody built it";
  if (story === "geo-arbitrage") return "geo arbitrage · built, invisible to AI";
  return "crowded";
}

/** Homepages for well-known cites in our demo/control set. Unknown strings stay unresolved. */
const KNOWN_CITED_HOMEPAGES: Record<string, string> = {
  datev: "https://www.datev.de",
  sevdesk: "https://sevdesk.de",
  lexoffice: "https://www.lexoffice.de",
};

/**
 * Resolve a cited brand/domain to a URL when we have one.
 * Vague demo strings ("generic energy blogs", "US voice-agent SaaS") return null —
 * the UI should show the final-version message instead of a fake link.
 */
export function resolveCitedUrl(cited: string): string | null {
  const raw = cited.trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  if (KNOWN_CITED_HOMEPAGES[lower]) return KNOWN_CITED_HOMEPAGES[lower]!;

  // Bare domain or URL-ish cite from a real Sitefire export
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(raw)) {
    return `https://${raw}`;
  }
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw) && !/\s/.test(raw)) {
    return `https://${raw}`;
  }

  return null;
}

export const CITED_FINAL_VERSION_HINT =
  "Final version: cited brands open their live domain from Sitefire Analyze. Demo placeholders are not linked yet.";
