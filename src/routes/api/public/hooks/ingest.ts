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
        // Prefer a dedicated hook secret. Publishable key is a weak gate if it
        // ever leaked from an old public .env commit — anyone could burn DFS/AI.
        const expected =
          process.env["INGEST_HOOK_SECRET"] || process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!expected || apikey !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        const { collectKeyword, slugify, prefetchDataForSeo } = await import("@/lib/ingest.server");
        const { getActiveWatchlist } = await import("@/lib/watchlist.server");
        const { resolveGeo } = await import("@/lib/geo.server");
        const { countryDetails } = await import("@/lib/geo.types");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const watchlist = await getActiveWatchlist();
        let selected = watchlist;
        let limit = watchlist.length;
        let countryCode = process.env["DEFAULT_INGEST_COUNTRY"] || "DE";
        let city: string | null = process.env["DEFAULT_INGEST_CITY"] || "Berlin";
        let languageCode = process.env["DEFAULT_INGEST_LANGUAGE"] || "de";
        try {
          const body = (await request.json()) as {
            limit?: number;
            countryCode?: string;
            city?: string | null;
            languageCode?: string;
            keywords?: unknown;
          };
          if (Array.isArray(body.keywords) && body.keywords.length > 0) {
            const wanted = new Set(
              body.keywords.map((item) => String(item).trim().toLowerCase()).filter(Boolean),
            );
            selected = watchlist.filter((item) => wanted.has(item.keyword.toLowerCase()));
          }
          if (typeof body.limit === "number" && body.limit > 0) limit = Math.min(body.limit, 50);
          if (body.countryCode && /^[a-z]{2}$/i.test(body.countryCode)) {
            countryCode = body.countryCode.toUpperCase();
          }
          if (body.city !== undefined) city = body.city?.trim() || null;
          if (body.languageCode) languageCode = body.languageCode.slice(0, 8);
        } catch {
          // empty body is fine
        }
        const geo = await resolveGeo({
          ...countryDetails(countryCode),
          languageCode,
          city,
          source: "manual",
        });

        const { data: run } = await supabaseAdmin
          .from("ingest_runs")
          .insert({ status: "running" })
          .select("id")
          .single();

        const batch = selected.slice(0, limit);
        let processed = 0;
        let snapshotWrites = 0;
        const failures: string[] = [];

        // One paid DataForSEO task covers the whole batch.
        const dfs = await prefetchDataForSeo(
          batch.map((item) => item.keyword),
          geo.locationCode ?? 2840,
          geo.languageCode,
        );
        if (dfs.error) failures.push(`dataforseo: ${dfs.error}`);

        for (const item of batch) {
          try {
            const result = await collectKeyword(item.keyword, item.category, item.tags, geo);
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
            // Additive rollout: a missing migration must not break the established Radar ingest.
            const { error: snapshotError } = await supabaseAdmin
              .from("signal_market_snapshots")
              .insert({
                signal_id: signal.id,
                ingest_run_id: run?.id ?? null,
                geo_key: result.geo.geoKey,
                country_code: result.geo.countryCode,
                city: result.geo.city,
                language_code: result.geo.languageCode,
                location_code: result.geo.locationCode,
                measurement_scope: result.geo.measurementScope,
                demand_score: result.demand,
                supply_score: result.supply,
                opportunity_score: result.opportunity,
                momentum: result.momentum,
                lead_weeks: result.leadWeeks,
                series: result.series,
                source_scopes: result.sourceScopes,
              });
            if (!snapshotError) snapshotWrites += 1;
            if (result.globalScores && result.globalSeries.length >= 8) {
              const { error: globalError } = await supabaseAdmin
                .from("signal_market_snapshots")
                .insert({
                  signal_id: signal.id,
                  ingest_run_id: run?.id ?? null,
                  geo_key: "GLOBAL",
                  country_code: result.geo.countryCode,
                  city: null,
                  language_code: "en",
                  location_code: null,
                  measurement_scope: "global",
                  demand_score: result.globalScores.demand,
                  supply_score: result.globalScores.supply,
                  opportunity_score: result.globalScores.opportunity,
                  momentum: result.globalScores.momentum,
                  lead_weeks: result.globalScores.lead,
                  series: result.globalSeries,
                  source_scopes: { "Google Trends": "global" },
                });
              if (!globalError) snapshotWrites += 1;
            }
            // A promoted observation becomes a measured signal on this ingest.
            const { data: linkedObservations } = await supabaseAdmin
              .from("signal_observations")
              .update({ signal_id: signal.id })
              .ilike("canonical_query", result.keyword)
              .select("id");
            const observationIds = (linkedObservations ?? []).map((row) => row.id);
            if (observationIds.length > 0) {
              await supabaseAdmin
                .from("app_seeds")
                .update({ signal_id: signal.id })
                .in("observation_id", observationIds);
            }
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

        return Response.json({
          processed,
          graphed,
          searchVolumeKeywords: dfs.fetched,
          searchVolumeCostUsd: dfs.cost,
          market: geo.geoKey,
          measurementScope: geo.measurementScope,
          snapshotWrites,
          failed: failures.length,
          failures,
        });
      },
    },
  },
});
