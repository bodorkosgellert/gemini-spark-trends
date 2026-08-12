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

/** Prefer Anthropic (SummerUP / Cursor). Lovable gateway kept as optional fallback. */
const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const LOVABLE_MODEL = "google/gemini-2.5-flash";

export const scoreBucket = (opportunity: number) => Math.round(opportunity / 10);

const SYSTEM = `You are a blunt product strategist writing a build brief for a solo developer.
You are given a demand signal with scores and raw evidence from public sources.
Be concrete and specific to this keyword. No generic startup advice, no hype, no filler.
Always include the strongest counter-arguments: a brief without a credible failure case is worthless.
Respond with a single JSON object only (no markdown fences), matching the requested keys exactly.`;

function buildUserPrompt(input: {
  keyword: string;
  category: string;
  tags: string[];
  demand: number;
  supply: number;
  opportunity: number;
  leadWeeks: number;
  why: string | null;
  evidence: Array<{ source: string; metric: string; value: number | null; detail: string | null }>;
}): string {
  const evidenceText = input.evidence
    .map((e) => `- ${e.source} / ${e.metric}: ${e.value ?? "n/a"} — ${e.detail ?? ""}`)
    .join("\n");

  return `Signal: "${input.keyword}"
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
}

function parseBriefJson(text: string, fallbackKeyword: string): Brief {
  const parsed = JSON.parse(text.replace(/^```json\s*|```$/g, "").trim()) as Partial<Brief>;
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];

  return {
    headline: String(parsed.headline ?? fallbackKeyword),
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

async function generateBriefAnthropic(
  apiKey: string,
  system: string,
  prompt: string,
  keyword: string,
): Promise<Brief> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 2048,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (res.status === 429) throw new Error("The brief desk is rate limited. Try again in a minute.");
  if (res.status === 402) throw new Error("Anthropic credits exhausted. Check your console billing.");
  if (!res.ok) throw new Error(`Brief generation failed (${res.status})`);

  const payload = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = payload.content?.find((c) => c.type === "text")?.text ?? "";
  return parseBriefJson(text, keyword);
}

async function generateBriefLovable(
  apiKey: string,
  system: string,
  prompt: string,
  keyword: string,
): Promise<Brief> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({
      model: LOVABLE_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (res.status === 429) throw new Error("The brief desk is rate limited. Try again in a minute.");
  if (res.status === 402) throw new Error("Lovable AI credits exhausted. Set ANTHROPIC_API_KEY instead.");
  if (!res.ok) throw new Error(`Brief generation failed (${res.status})`);

  const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = payload.choices?.[0]?.message?.content ?? "";
  return parseBriefJson(text, keyword);
}

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
  const anthropicKey = process.env["ANTHROPIC_API_KEY"];
  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (!anthropicKey && !lovableKey) {
    throw new Error("Missing ANTHROPIC_API_KEY (preferred) or LOVABLE_API_KEY");
  }

  const prompt = buildUserPrompt(input);

  if (anthropicKey) {
    return generateBriefAnthropic(anthropicKey, SYSTEM, prompt, input.keyword);
  }
  return generateBriefLovable(lovableKey!, SYSTEM, prompt, input.keyword);
}

export const BRIEF_MODEL = process.env["ANTHROPIC_API_KEY"] ? ANTHROPIC_MODEL : LOVABLE_MODEL;