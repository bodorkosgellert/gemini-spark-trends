import { createServerFn } from "@tanstack/react-start";

export type SignalRow = {
  id: string;
  slug: string;
  keyword: string;
  category: string;
  tags: string[];
  demand_score: number;
  supply_score: number;
  opportunity_score: number;
  momentum: number;
  lead_weeks: number;
  first_seen_at: string | null;
  why: string | null;
  series: number[];
  updated_at: string;
};

export type EvidenceRow = {
  signal_id: string;
  source: string;
  metric: string;
  value: number | null;
  detail: string | null;
  url: string | null;
};

export type MarketSnapshotRow = {
  signal_id: string;
  geo_key: string;
  country_code: string;
  city: string | null;
  measurement_scope: "city-measured" | "country-proxy" | "global";
  demand_score: number;
  supply_score: number;
  opportunity_score: number;
  momentum: number;
  lead_weeks: number;
  series: number[];
  observed_at: string;
};

export type SignalOpportunityContext = {
  observationCount: number;
  appSeedCount: number;
  evidenceTypes: string[];
  friction: string | null;
  workaround: string | null;
};

export const listMarketContext = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const input = data as { geoKey?: unknown; countryCode?: unknown };
    const geoKey = String(input?.geoKey ?? "GLOBAL").slice(0, 120);
    const countryCode = String(input?.countryCode ?? geoKey)
      .toUpperCase()
      .slice(0, 2);
    return { geoKey, countryCode };
  })
  .handler(async ({ data }) => {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
      const client = createClient(process.env["SUPABASE_URL"]!, key, {
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

      const [snapshotsResult, observationsResult, seedsResult] = await Promise.all([
        client
          .from("signal_market_snapshots")
          .select(
            "signal_id, geo_key, country_code, city, measurement_scope, demand_score, supply_score, opportunity_score, momentum, lead_weeks, series, observed_at",
          )
          .in("geo_key", [...new Set([data.geoKey, data.countryCode, "GLOBAL"])])
          .order("observed_at", { ascending: false })
          .limit(500),
        client
          .from("signal_observations")
          .select("id, signal_id, evidence_type, friction, workaround")
          .not("signal_id", "is", null),
        client.from("app_seeds").select("observation_id, signal_id"),
      ]);

      const latest = new Map<string, MarketSnapshotRow>();
      const baselines = new Map<string, MarketSnapshotRow>();
      const globals = new Map<string, MarketSnapshotRow>();
      for (const row of snapshotsResult.data ?? []) {
        const typed = row as MarketSnapshotRow;
        if (row.geo_key === data.geoKey && !latest.has(row.signal_id)) {
          latest.set(row.signal_id, typed);
        }
        if (row.geo_key === data.countryCode && !baselines.has(row.signal_id)) {
          baselines.set(row.signal_id, typed);
        }
        if (row.geo_key === "GLOBAL" && !globals.has(row.signal_id)) {
          globals.set(row.signal_id, typed);
        }
      }

      const seedCountByObservation = new Map<string, number>();
      for (const seed of seedsResult.data ?? []) {
        seedCountByObservation.set(
          seed.observation_id,
          (seedCountByObservation.get(seed.observation_id) ?? 0) + 1,
        );
      }
      const context = new Map<string, SignalOpportunityContext>();
      for (const observation of observationsResult.data ?? []) {
        if (!observation.signal_id) continue;
        const current = context.get(observation.signal_id) ?? {
          observationCount: 0,
          appSeedCount: 0,
          evidenceTypes: [],
          friction: null,
          workaround: null,
        };
        current.observationCount += 1;
        current.appSeedCount += seedCountByObservation.get(observation.id) ?? 0;
        if (!current.evidenceTypes.includes(observation.evidence_type)) {
          current.evidenceTypes.push(observation.evidence_type);
        }
        current.friction ??= observation.friction;
        current.workaround ??= observation.workaround;
        context.set(observation.signal_id, current);
      }

      return {
        snapshots: Object.fromEntries(latest),
        baselines: Object.fromEntries(baselines),
        globals: Object.fromEntries(globals),
        opportunities: Object.fromEntries(context),
        available: !snapshotsResult.error,
      };
    } catch {
      return { snapshots: {}, baselines: {}, globals: {}, opportunities: {}, available: false };
    }
  });

export const listSignals = createServerFn({ method: "GET" }).handler(async () => {
  const empty = { signals: [] as SignalRow[], evidence: [] as EvidenceRow[], lastRun: null };
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

    const [signals, evidence, runs] = await Promise.all([
      client
        .from("signals")
        .select(
          "id, slug, keyword, category, tags, demand_score, supply_score, opportunity_score, momentum, lead_weeks, first_seen_at, why, series, updated_at",
        )
        .order("opportunity_score", { ascending: false }),
      client.from("signal_evidence").select("signal_id, source, metric, value, detail, url"),
      client
        .from("ingest_runs")
        .select("finished_at, status, keywords_processed")
        .order("started_at", { ascending: false })
        .limit(1),
    ]);

    return {
      signals: (signals.data ?? []) as SignalRow[],
      evidence: (evidence.data ?? []) as EvidenceRow[],
      lastRun: (runs.data ?? [])[0] ?? null,
    };
  } catch {
    return empty;
  }
});
