import gapsFile from "@/data/ai-citation-gaps.json";

export type AiGapLevel = "high" | "medium" | "low";

export type AiCitationGap = {
  slug: string;
  keyword: string;
  gap: AiGapLevel;
  status: "demo" | "sitefire";
  prompt: string;
  cited: string[];
  localCited: boolean;
  note: string;
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
