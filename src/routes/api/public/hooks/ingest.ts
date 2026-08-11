import { createFileRoute } from "@tanstack/react-router";

/**
 * Refresh the signal engine. Called by the scheduler (and manually during a
 * demo). Requires the project apikey header so it is not an open write.
 */
export const Route = createFileRoute("/api/public/hooks/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        const expected = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!expected || apikey !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        const { collectKeyword, slugify } = await import("@/lib/ingest.server");
        const { WATCHLIST } = await import("@/lib/watchlist");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let limit = WATCHLIST.length;
        try {
          const body = (await request.json()) as { limit?: number };
          if (typeof body.limit === "number" && body.limit > 0) limit = Math.min(body.limit, 50);
        } catch {
          // empty body is fine
        }

        const { data: run } = await supabaseAdmin
          .from("ingest_runs")
          .insert({ status: "running" })
          .select("id")
          .single();

        const batch = WATCHLIST.slice(0, limit);
        let processed = 0;
        const failures: string[] = [];

        for (const item of batch) {
          try {
            const result = await collectKeyword(item.keyword, item.category, item.tags);
            const { data: signal, error } = await supabaseAdmin
              .from("signals")
              .upsert(
                {
                  slug: slugify(result.keyword),
                  keyword: result.keyword,
                  category: result.category,
                  tags: result.tags,
                  demand_score: result.demand,
                  supply_score: result.supply,
                  opportunity_score: result.opportunity,
                  momentum: result.momentum,
                  lead_weeks: result.leadWeeks,
                  first_seen_at: result.firstSeenAt,
                  why: result.why,
                  series: result.series,
                },
                { onConflict: "slug" },
              )
              .select("id")
              .single();
            if (error) throw error;

            await supabaseAdmin.from("signal_evidence").delete().eq("signal_id", signal.id);
            await supabaseAdmin.from("signal_evidence").insert(
              result.readings.map((reading) => ({
                signal_id: signal.id,
                source: reading.source,
                metric: reading.metric,
                value: reading.value,
                detail: reading.detail,
                url: reading.url,
              })),
            );
            processed += 1;
          } catch (error) {
            failures.push(`${item.keyword}: ${(error as Error).message}`);
          }
        }

        if (run?.id) {
          await supabaseAdmin
            .from("ingest_runs")
            .update({
              finished_at: new Date().toISOString(),
              status: failures.length === batch.length ? "failed" : "ok",
              keywords_processed: processed,
              notes: failures.slice(0, 5).join(" | ") || null,
            })
            .eq("id", run.id);
        }

        // Project the freshly scored signals into the Cognee knowledge graph.
        // Best-effort: a graph failure must never fail the ingest run.
        let graphed = 0;
        try {
          const { syncGraph } = await import("@/lib/cognee.server");
          const { data: rows } = await supabaseAdmin
            .from("signals")
            .select(
              "id, keyword, category, tags, demand_score, supply_score, opportunity_score, momentum, lead_weeks, why",
            )
            .order("opportunity_score", { ascending: false })
            .limit(60);
          const { data: evidence } = await supabaseAdmin
            .from("signal_evidence")
            .select("signal_id, source, metric, value, detail");

          const result = await syncGraph(
            (rows ?? []).map((row) => ({
              keyword: row.keyword,
              category: row.category,
              tags: row.tags ?? [],
              demand: row.demand_score,
              supply: row.supply_score,
              opportunity: row.opportunity_score,
              momentum: row.momentum,
              leadWeeks: row.lead_weeks,
              why: row.why,
              evidence: (evidence ?? []).filter((e) => e.signal_id === row.id),
            })),
          );
          graphed = result.documents;
        } catch (error) {
          failures.push(`graph: ${(error as Error).message}`);
        }

        return Response.json({ processed, graphed, failed: failures.length, failures });
      },
    },
  },
});