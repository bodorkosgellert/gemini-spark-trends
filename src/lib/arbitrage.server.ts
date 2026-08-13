/**
 * Global arbitrage desk: origin market (proven) vs target market (gap).
 * Live scan uses Tavily coverage deltas — not LLM-invented concepts.
 */
import seed from "@/data/global-arbitrage.json";
import type {
  ArbitrageScanResult,
  GlobalArbitrageIdea,
  LocalCompetition,
} from "@/lib/arbitrage.types";

const COUNTRY_NAME: Record<string, string> = {
  US: "United States",
  UK: "United Kingdom",
  DE: "Germany",
  JP: "Japan",
  BR: "Brazil",
};

async function tavilyCount(query: string): Promise<{ count: number; top?: string }> {
  const key = process.env["TAVILY_API_KEY"];
  if (!key) return { count: 0 };
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      query,
      topic: "general",
      max_results: 8,
      search_depth: "basic",
    }),
  });
  if (!res.ok) return { count: 0 };
  const data = (await res.json()) as {
    results?: Array<{ title?: string }>;
  };
  const results = data.results ?? [];
  const top = results[0]?.title;
  return top ? { count: results.length, top } : { count: results.length };
}

function competitionFromCounts(originCount: number, targetCount: number): LocalCompetition {
  if (targetCount <= 1) return "none";
  if (targetCount <= 3) return "weak";
  if (originCount >= targetCount * 1.5) return "fragmented";
  return "dominated";
}

function scoreFromDelta(originCount: number, targetCount: number, seedScore: number): number {
  if (originCount === 0 && targetCount === 0) return seedScore;
  const gap = Math.max(0, originCount - targetCount);
  const raw = 5 + gap * 0.55 + (targetCount <= 2 ? 1.5 : 0);
  return Math.round(Math.min(10, Math.max(4, raw)) * 10) / 10;
}

function listSeed(): GlobalArbitrageIdea[] {
  return (seed.ideas as GlobalArbitrageIdea[]).map((i) => ({ ...i, source: "seed" }));
}

function conceptKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function applyMeasuredSnapshots(
  ideas: GlobalArbitrageIdea[],
): Promise<GlobalArbitrageIdea[]> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const countries = [
      ...new Set(
        ideas.flatMap((idea) => [
          idea.validatedMarket.countryCode,
          idea.targetMarketOpportunity.countryCode,
        ]),
      ),
    ];
    const [{ data: signals }, { data: snapshots, error }] = await Promise.all([
      supabaseAdmin.from("signals").select("id, keyword"),
      supabaseAdmin
        .from("signal_market_snapshots")
        .select(
          "signal_id, country_code, demand_score, supply_score, opportunity_score, observed_at",
        )
        .in("country_code", countries)
        .order("observed_at", { ascending: false }),
    ]);
    if (error) return ideas;
    const signalByConcept = new Map(
      (signals ?? []).map((signal) => [conceptKey(signal.keyword), signal.id]),
    );
    const latest = new Map<string, NonNullable<typeof snapshots>[number]>();
    for (const snapshot of snapshots ?? []) {
      const key = `${snapshot.signal_id}:${snapshot.country_code}`;
      if (!latest.has(key)) latest.set(key, snapshot);
    }
    return ideas.map((idea) => {
      const signalId = signalByConcept.get(conceptKey(idea.coreConcept));
      if (!signalId) return idea;
      const origin = latest.get(`${signalId}:${idea.validatedMarket.countryCode}`);
      const target = latest.get(`${signalId}:${idea.targetMarketOpportunity.countryCode}`);
      if (!origin || !target) return idea;
      const capitalizationScore =
        Math.round(((origin.demand_score + target.opportunity_score) / 20) * 10) / 10;
      return {
        ...idea,
        capitalizationScore,
        source: "measured",
        targetMarketOpportunity: {
          ...idea.targetMarketOpportunity,
          localSearchVolume: Math.round(target.demand_score),
          localCompetition:
            target.supply_score < 20
              ? "none"
              : target.supply_score < 40
                ? "weak"
                : target.supply_score < 70
                  ? "fragmented"
                  : "dominated",
        },
        note: `Measured snapshots: origin demand ${origin.demand_score} → target opportunity ${target.opportunity_score} / supply ${target.supply_score}.`,
      };
    });
  } catch {
    return ideas;
  }
}

export async function listArbitrageIdeas(): Promise<ArbitrageScanResult> {
  const ideas = await applyMeasuredSnapshots(listSeed());
  return {
    ideas: ideas.sort((a, b) => b.capitalizationScore - a.capitalizationScore),
    generatedAt: (seed as { updatedAt?: string }).updatedAt ?? new Date().toISOString(),
    note: "Seeded geographic arbitrage board (Europe-first). Run live scan to refresh coverage deltas via Tavily.",
  };
}

/** Parallel origin vs target Tavily queries per seed concept. */
export async function scanArbitrageIdeas(): Promise<ArbitrageScanResult> {
  const base = listSeed();
  const key = process.env["TAVILY_API_KEY"];
  if (!key) {
    return {
      ideas: base.sort((a, b) => b.capitalizationScore - a.capitalizationScore),
      generatedAt: new Date().toISOString(),
      note: "TAVILY_API_KEY missing — showing seed board only.",
    };
  }

  const ideas: GlobalArbitrageIdea[] = [];
  for (const idea of base) {
    const origin =
      COUNTRY_NAME[idea.validatedMarket.countryCode] ?? idea.validatedMarket.countryCode;
    const target =
      COUNTRY_NAME[idea.targetMarketOpportunity.countryCode] ??
      idea.targetMarketOpportunity.countryCode;
    const qOrigin = `${idea.coreConcept} software OR SaaS ${origin}`;
    const qTarget = `${idea.coreConcept} Software OR App OR Tool ${target}`;
    const [o, t] = await Promise.all([tavilyCount(qOrigin), tavilyCount(qTarget)]);
    const localCompetition = competitionFromCounts(o.count, t.count);
    const capitalizationScore = scoreFromDelta(o.count, t.count, idea.capitalizationScore);
    const localSearchVolume = Math.min(
      100,
      Math.round(t.count * 12 + (o.count > t.count ? 20 : 0)),
    );

    ideas.push({
      ...idea,
      capitalizationScore,
      source: "live",
      targetMarketOpportunity: {
        ...idea.targetMarketOpportunity,
        localSearchVolume,
        localCompetition,
      },
      note: `Origin hits ${o.count}${o.top ? ` · ${o.top}` : ""} → target hits ${t.count}${t.top ? ` · ${t.top}` : ""}`,
    });
  }

  const measuredIdeas = await applyMeasuredSnapshots(ideas);
  return {
    ideas: measuredIdeas.sort((a, b) => b.capitalizationScore - a.capitalizationScore),
    generatedAt: new Date().toISOString(),
    note: "Measured market snapshots take precedence where both markets exist; remaining rows use live Tavily coverage delta.",
  };
}
