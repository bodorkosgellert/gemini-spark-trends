import { generateBrief, scoreBucket, BRIEF_MODEL, type Brief } from "./briefs.server";
import type { BriefResult } from "./briefs.functions";

export async function buildBriefForSlug(slug: string): Promise<BriefResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: signal, error } = await supabaseAdmin
    .from("signals")
    .select(
      "id, keyword, category, tags, demand_score, supply_score, opportunity_score, lead_weeks, why",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!signal) throw new Error(`No signal on the wire for "${slug}"`);

  const bucket = scoreBucket(signal.opportunity_score ?? 0);

  const { data: cached } = await supabaseAdmin
    .from("signal_briefs")
    .select("brief, created_at")
    .eq("signal_id", signal.id)
    .eq("score_bucket", bucket)
    .maybeSingle();

  const base = {
    keyword: signal.keyword,
    category: signal.category,
    tags: signal.tags ?? [],
    demand: signal.demand_score ?? 0,
    supply: signal.supply_score ?? 0,
    opportunity: signal.opportunity_score ?? 0,
    leadWeeks: signal.lead_weeks ?? 0,
    why: signal.why ?? null,
  };

  if (cached?.brief) {
    return {
      ...base,
      brief: cached.brief as unknown as Brief,
      cached: true,
      createdAt: cached.created_at,
    };
  }

  const { data: evidence } = await supabaseAdmin
    .from("signal_evidence")
    .select("source, metric, value, detail")
    .eq("signal_id", signal.id);

  const { getAiCitationGap } = await import("./ai-citation-gap");
  const aiGap = getAiCitationGap(slug, signal.keyword);
  const evidenceRows = [...(evidence ?? [])];
  if (aiGap) {
    evidenceRows.push({
      source: "Sitefire",
      metric: `ai_citation_gap_${aiGap.gap}`,
      value: aiGap.gap === "high" ? 90 : aiGap.gap === "medium" ? 55 : 20,
      detail: `${aiGap.note} Prompt: ${aiGap.prompt}. Cited: ${aiGap.cited.join(", ") || "none"}. localCited=${aiGap.localCited} (${aiGap.status})`,
    });
  }

  const brief = await generateBrief({ ...base, evidence: evidenceRows });
  const createdAt = new Date().toISOString();

  await supabaseAdmin.from("signal_briefs").upsert(
    {
      signal_id: signal.id,
      score_bucket: bucket,
      model: BRIEF_MODEL,
      brief: JSON.parse(JSON.stringify(brief)),
      created_at: createdAt,
    },
    { onConflict: "signal_id,score_bucket" },
  );

  return { ...base, brief, cached: false, createdAt };
}