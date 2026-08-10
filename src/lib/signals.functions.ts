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

export const listSignals = createServerFn({ method: "GET" }).handler(async () => {
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
});