import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { SiteNav } from "@/components/SiteNav";
import { ObservationDiscoverPage } from "@/components/ObservationDiscover";
import { listPromoted, promoteCandidate, runDiscover } from "@/lib/discover.functions";
import type { DiscoverCandidate } from "@/lib/discover.types";

export const Route = createFileRoute("/discover")({
  component: ObservationDiscoverPage,
  head: () => ({
    meta: [
      { title: "Discover — fill the desk from the wire | TrendSpark" },
      {
        name: "description",
        content:
          "Explore evidence-backed human friction, branch each observation into distinct app directions, then validate or track the underlying signal.",
      },
    ],
  }),
});

export function LegacyDiscoverPage() {
  const discover = useServerFn(runDiscover);
  const loadPromoted = useServerFn(listPromoted);
  const promote = useServerFn(promoteCandidate);

  const [enabled, setEnabled] = useState(false);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    data,
    refetch,
    isFetching,
    isError,
    error: queryError,
  } = useQuery({
    queryKey: ["discover-candidates"],
    queryFn: () => discover(),
    enabled,
    staleTime: 60_000,
  });

  const promotedQuery = useQuery({
    queryKey: ["promoted-watchlist"],
    queryFn: () => loadPromoted(),
    staleTime: 15_000,
  });

  const onRun = async () => {
    setError(null);
    setFlash(null);
    setEnabled(true);
    await refetch();
  };

  const onPromote = async (c: DiscoverCandidate) => {
    setPromoting(c.keyword);
    setError(null);
    setFlash(null);
    try {
      const res = await promote({
        data: { keyword: c.keyword, category: c.category, tags: c.tags },
      });
      setFlash(
        `Promoted “${res.item.keyword}”. Active watchlist now ${res.activeCount} keywords — run ingest (Jobs or Radar hook) to score it.`,
      );
      await promotedQuery.refetch();
      await refetch();
    } catch (err) {
      setError((err as Error).message || "Promote failed.");
    } finally {
      setPromoting(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <div className="mx-auto max-w-4xl px-5 pb-24 pt-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
          Desk · cold start
        </p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">
          Discover
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Fill the queue from live desks (Tavily + HN Ask). Keywords are niche seeds / tool-shaped
          phrases — story titles are evidence only. Ranked shortlist → promote →{" "}
          <Link to="/radar" className="text-foreground underline-offset-2 hover:underline">
            Radar ingest
          </Link>{" "}
          scores survivors. No LLM invents keywords or Δ%.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onRun}
            disabled={isFetching}
            className="rounded-md bg-primary px-4 py-2 font-mono text-xs uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-50"
          >
            {isFetching ? "Pulling desks…" : "Run discover"}
          </button>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {data
              ? `${data.candidates.length} candidates · ${new Date(data.generatedAt).toUTCString()}`
              : "Idle until you run"}
          </span>
        </div>

        {flash && (
          <p className="mt-4 border border-primary/30 bg-secondary/40 px-3 py-2 text-sm text-foreground">
            {flash}
          </p>
        )}
        {(error || isError) && (
          <p className="mt-4 border border-destructive/40 px-3 py-2 text-sm text-destructive">
            {error || (queryError as Error)?.message || "Discover failed."}
          </p>
        )}
        {data?.note && <p className="mt-3 text-xs text-muted-foreground">{data.note}</p>}

        <section className="mt-10">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Ranked shortlist
          </h2>
          {!data && !isFetching && (
            <p className="mt-4 text-sm text-muted-foreground">
              Hit Run discover to pull the last ~30 days from the desks.
            </p>
          )}
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {(data?.candidates ?? []).map((c) => (
              <li key={c.keyword} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-display text-lg font-bold tracking-tight">
                      {c.keyword}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
                      score {c.score}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {c.desk} · {c.evidenceCount} hits
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{c.reason}</p>
                  {c.topTitle && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {c.topUrl ? (
                        <a
                          href={c.topUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline-offset-2 hover:underline"
                        >
                          {c.topTitle}
                        </a>
                      ) : (
                        c.topTitle
                      )}
                    </p>
                  )}
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {c.category} · {c.tags.join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={promoting === c.keyword}
                  onClick={() => onPromote(c)}
                  className="shrink-0 rounded-md border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-secondary disabled:opacity-50"
                >
                  {promoting === c.keyword ? "Promoting…" : "Promote to watchlist"}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Promoted (active queue extras)
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {(promotedQuery.data ?? []).length === 0 && (
              <li className="text-muted-foreground">None yet — promote from the shortlist.</li>
            )}
            {(promotedQuery.data ?? []).map((p) => (
              <li key={p.keyword} className="font-mono text-xs uppercase tracking-[0.08em]">
                {p.keyword}
                <span className="ml-2 text-muted-foreground normal-case tracking-normal">
                  {p.tags.join(", ")}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            After promote: Cloud → Jobs → trendspark-daily-ingest Refresh, or POST the ingest hook.
            Promotions write to{" "}
            <code className="font-mono">server/promoted-watchlist.local.json</code> (and{" "}
            <code className="font-mono">src/data/promoted-watchlist.json</code> when writable).
          </p>
        </section>
      </div>
    </div>
  );
}
