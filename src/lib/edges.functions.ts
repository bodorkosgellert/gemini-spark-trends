import { createServerFn } from "@tanstack/react-start";

export type SignalEdgeRow = {
  from_slug: string;
  to_slug: string;
  edge_type: string;
  weight: number;
  evidence: string | null;
};

export type ObservationBranch = {
  signalSlug: string;
  signal: string;
  observationId: string;
  evidenceType: string;
  friction: string;
  family: string;
  appSeed: string;
};

export const listObservationBranches = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: seeds, error } = await supabaseAdmin
      .from("app_seeds")
      .select("observation_id, signal_id, family, title")
      .not("signal_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(40);
    if (error || !seeds?.length)
      return { branches: [] as ObservationBranch[], source: "fallback" as const };
    const signalIds = [
      ...new Set(seeds.flatMap((seed) => (seed.signal_id ? [seed.signal_id] : []))),
    ];
    const observationIds = [...new Set(seeds.map((seed) => seed.observation_id))];
    const [{ data: signals }, { data: observations }] = await Promise.all([
      supabaseAdmin.from("signals").select("id, slug, keyword").in("id", signalIds),
      supabaseAdmin
        .from("signal_observations")
        .select("id, evidence_type, friction, observed_behavior")
        .in("id", observationIds),
    ]);
    const signalMap = new Map((signals ?? []).map((signal) => [signal.id, signal]));
    const observationMap = new Map(
      (observations ?? []).map((observation) => [observation.id, observation]),
    );
    const branches = seeds.flatMap<ObservationBranch>((seed) => {
      if (!seed.signal_id) return [];
      const signal = signalMap.get(seed.signal_id);
      const observation = observationMap.get(seed.observation_id);
      if (!signal || !observation) return [];
      return [
        {
          signalSlug: signal.slug,
          signal: signal.keyword,
          observationId: observation.id,
          evidenceType: observation.evidence_type,
          friction: observation.friction || observation.observed_behavior,
          family: seed.family,
          appSeed: seed.title,
        },
      ];
    });
    return { branches, source: "table" as const };
  } catch {
    return { branches: [] as ObservationBranch[], source: "fallback" as const };
  }
});

/**
 * Tag -> App Store market edges from Postgres (`signal_edges`).
 *
 * Approach C: this table is the source of truth for edges; Cognee stays the natural-language
 * ask layer. `/graph` falls back to its in-file map when this returns nothing, so the page
 * still renders before the migration is applied.
 */
export const listSignalEdges = createServerFn({ method: "GET" }).handler(async () => {
  const empty = { edges: [] as SignalEdgeRow[], source: "fallback" as const };
  try {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) return empty;

    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
            headers.delete("Authorization");
          }
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });

    const { data, error } = await client
      .from("signal_edges")
      .select("from_slug, to_slug, edge_type, weight, evidence")
      .eq("edge_type", "SHIPS_INTO");

    // A missing table or a cold key should degrade to the in-file map, not blank the page.
    if (error) return empty;

    return {
      edges: (data ?? []) as SignalEdgeRow[],
      source: (data && data.length > 0 ? "table" : "fallback") as "table" | "fallback",
    };
  } catch {
    return empty;
  }
});

/**
 * `to_slug` is stored hyphenated (`ai-agent`) while App Store market queries are spaced
 * (`ai agent`), and no market query contains a hyphen — so hyphens are unambiguously word
 * separators here. `from_slug` is NOT converted: `supply-chain` is a genuine tag name.
 */
export function marketQueryFromSlug(toSlug: string): string {
  return toSlug.replace(/-/g, " ");
}

/** Fold edge rows into the `Record<tag, marketQuery[]>` shape `/graph` already draws from. */
export function edgesToMap(rows: SignalEdgeRow[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const row of rows) {
    const market = marketQueryFromSlug(row.to_slug);
    const list = (map[row.from_slug] ??= []);
    if (!list.includes(market)) list.push(market);
  }
  return map;
}
