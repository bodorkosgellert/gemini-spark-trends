/**
 * Build Brief generator — server only.
 *
 * Turns a scored signal plus its evidence rows into an actionable brief:
 * what to build, who pays, what to ship in week one, and — required — the
 * strongest reasons it dies. Briefs are cached in `signal_briefs` keyed by
 * signal id + score bucket, so a brief is regenerated only when the
 * opportunity score moves more than 10 points.
 */

export type Brief = {
  headline: string;
  one_liner: string;
  hero_flow: string[];
  who_pays: string;
  pricing: string;
  first_week: string[];
  domain_knowledge: string[];
  why_this_dies: string[];
  disproof: string;
  build_prompt: string;
};

const MODEL = "google/gemini-2.5-flash";

export const scoreBucket = (opportunity: number) => Math.round(opportunity / 10);

const SYSTEM = `You are a blunt product strategist writing a build brief for a solo developer.
You are given a demand signal with scores and raw evidence from public sources.
Be concrete and specific to this keyword. No generic startup advice, no hype, no filler.
Always include the strongest counter-arguments: a brief without a credible failure case is worthless.
Respond with json only, matching the requested keys exactly.`;

export async function generateBrief(input: {
  keyword: string;
  category: string;
  tags: string[];
  demand: number;
  supply: number;
  opportunity: number;
  leadWeeks: number;
  why: string | null;
  evidence: Array<{ source: string; metric: string; value: number | null; detail: string | null }>;
}): Promise<Brief> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

  const evidenceText = input.evidence
    .map((e) => `- ${e.source} / ${e.metric}: ${e.value ?? "n/a"} — ${e.detail ?? ""}`)
    .join("\n");

  const prompt = `Signal: "${input.keyword}"
Category: ${input.category}
Tags: ${input.tags.join(", ")}
Scores (0-100): demand ${input.demand}, supply/crowding ${input.supply}, opportunity ${input.opportunity}
Lead: ${input.leadWeeks} weeks above baseline
Engine note: ${input.why ?? "none"}

Evidence:
${evidenceText || "- none collected"}

Return json with these keys:
headline (short product name idea),
one_liner (one sentence, what it does for whom),
hero_flow (array of 3-5 steps a user takes in the first 60 seconds),
who_pays (the specific buyer and the budget line it comes out of),
pricing (a concrete price point and model, with a number),
first_week (array of 4-6 shippable tasks for day 1-7),
domain_knowledge (array of 3-4 things you must know or learn that a generic builder would not),
why_this_dies (array of exactly 3 strongest reasons this fails),
disproof (what evidence, concretely, would prove the idea wrong within two weeks),
build_prompt (a single paste-ready prompt for an AI coding tool that would produce a working v1 of this).`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (res.status === 429) throw new Error("The brief desk is rate limited. Try again in a minute.");
  if (res.status === 402) throw new Error("AI credits exhausted. Top up to keep writing briefs.");
  if (!res.ok) throw new Error(`Brief generation failed (${res.status})`);

  const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = payload.choices?.[0]?.message?.content ?? "";
  const parsed = JSON.parse(text.replace(/^```json\s*|```$/g, "").trim()) as Partial<Brief>;

  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];

  return {
    headline: String(parsed.headline ?? input.keyword),
    one_liner: String(parsed.one_liner ?? ""),
    hero_flow: arr(parsed.hero_flow),
    who_pays: String(parsed.who_pays ?? ""),
    pricing: String(parsed.pricing ?? ""),
    first_week: arr(parsed.first_week),
    domain_knowledge: arr(parsed.domain_knowledge),
    why_this_dies: arr(parsed.why_this_dies).slice(0, 3),
    disproof: String(parsed.disproof ?? ""),
    build_prompt: String(parsed.build_prompt ?? ""),
  };
}

export const BRIEF_MODEL = MODEL;