import { createServerFn } from "@tanstack/react-start";

export type SignalEdgeRow = {
  from_slug: string;
  to_slug: string;
  edge_type: string;
  weight: number;
  evidence: string | null;
};

/**
 * Tag -> App Store market edges from Postgres (`signal_edges`).
 *
 * Approach C: this table is the source of truth for edges; Cognee stays the natural-language
 * ask layer. `/graph` falls back to its in-file map when this returns nothing, so the page
 * still renders before the migration is applied.
 */
export const listSignalEdges = createServerFn({ method: "GET" }).handler(async () => {
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

  const { data, error } = await client
    .from("signal_edges")
    .select("from_slug, to_slug, edge_type, weight, evidence")
    .eq("edge_type", "SHIPS_INTO");

  // A missing table or a cold key should degrade to the in-file map, not blank the page.
  if (error) return { edges: [] as SignalEdgeRow[], source: "fallback" as const };

  return {
    edges: (data ?? []) as SignalEdgeRow[],
    source: (data && data.length > 0 ? "table" : "fallback") as "table" | "fallback",
  };
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
