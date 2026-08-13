/* Hallmark · component: observation explorer · genre: playful · theme: existing TrendSpark
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: pass
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";

import { useGeo } from "@/components/geo-context";
import { SiteNav } from "@/components/SiteNav";
import { discoverObservations, promoteCandidate, saveAppSeed } from "@/lib/discover.functions";
import { geoLabel } from "@/lib/geo.types";
import { provenanceLabel, type AppSeed, type OpportunitySpace } from "@/lib/observations.types";

type Lens = "interesting" | "commercial";

function scoreFor(seed: AppSeed, lens: Lens): number {
  return lens === "interesting" ? seed.interestingScore : seed.commercialScore;
}

function tagsFor(space: OpportunitySpace): string[] {
  return [
    space.observation.evidenceType,
    space.observation.geo.city ? "local" : "global",
    "observed-friction",
  ];
}

export function ObservationDiscoverPage() {
  const { selection, geoKey } = useGeo();
  const run = useServerFn(discoverObservations);
  const promote = useServerFn(promoteCandidate);
  const persistSeed = useServerFn(saveAppSeed);
  const [enabled, setEnabled] = useState(false);
  const [lens, setLens] = useState<Lens>("interesting");
  const [tracking, setTracking] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["observation-discovery", geoKey],
    queryFn: () => run({ data: selection }),
    enabled,
    staleTime: 5 * 60_000,
  });

  const spaces = useMemo(
    () =>
      (query.data?.spaces ?? []).map((space) => ({
        ...space,
        appSeeds: [...space.appSeeds].sort((a, b) => scoreFor(b, lens) - scoreFor(a, lens)),
      })),
    [lens, query.data?.spaces],
  );

  const saveDirection = async (seed: AppSeed) => {
    setSaved((current) => new Set(current).add(seed.sourceHash + seed.family));
    if (!seed.id) {
      setMessage(
        `Saved “${seed.title}” in this exploration. Apply the Cloud migration to archive it across sessions.`,
      );
      return;
    }
    try {
      await persistSeed({ data: { id: seed.id } });
      setMessage(`Saved and archived “${seed.title}”.`);
    } catch (error) {
      setMessage(`Saved locally; Cloud archive failed: ${(error as Error).message}`);
    }
  };

  const trackSignal = async (space: OpportunitySpace) => {
    setTracking(space.observation.evidenceHash);
    setMessage(null);
    try {
      const result = await promote({
        data: {
          keyword: space.observation.canonicalQuery,
          category: space.observation.evidenceType,
          tags: tagsFor(space),
        },
      });
      setMessage(
        `Tracking “${result.item.keyword}”. The next ${geoLabel(selection)} ingest will measure it.`,
      );
    } catch (error) {
      setMessage(`Could not track this signal: ${(error as Error).message}`);
    } finally {
      setTracking(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-5xl overflow-x-hidden px-5 pb-24 pt-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
              Strange things people already do
            </p>
            <h1 className="mt-2 min-w-0 [overflow-wrap:anywhere] font-display text-4xl font-extrabold tracking-[-0.03em] sm:text-6xl">
              Follow the workaround.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              TrendSpark looks for complaints, spreadsheets, stitched-together tools and manual
              coordination around {geoLabel(selection)}. Evidence stays evidence; the branches below
              are clearly labelled interpretations.
            </p>
          </div>

          <aside className="border-l-2 border-primary pl-4 lg:pt-8">
            <p className="font-display text-lg font-bold">Two ways to browse</p>
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-md bg-secondary p-1">
              {(["interesting", "commercial"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLens(value)}
                  aria-pressed={lens === value}
                  className="rounded px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px aria-pressed:bg-background aria-pressed:text-primary"
                >
                  {value}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Interesting rewards novelty and delight. Commercial rewards a plausible buyer. Neither
              is measured demand.
            </p>
          </aside>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setEnabled(true);
              void query.refetch();
            }}
            disabled={query.isFetching}
            className="rounded-md bg-primary px-5 py-3 font-mono text-xs uppercase tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
          >
            {query.isFetching
              ? "Reading the wire…"
              : spaces.length > 0
                ? "Refresh observations"
                : "Find observations"}
          </button>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {geoLabel(selection)} · {spaces.length || "—"} evidence spaces
          </span>
        </div>

        {message && (
          <p
            role="status"
            className="mt-4 border-l-2 border-primary bg-secondary/40 px-3 py-2 text-sm"
          >
            {message}
          </p>
        )}
        {query.isError && (
          <p
            role="alert"
            className="mt-4 border-l-2 border-destructive px-3 py-2 text-sm text-destructive"
          >
            {(query.error as Error).message || "The observation desk did not load."}
          </p>
        )}
        {query.data && spaces.length === 0 && (
          <p className="mt-8 border-y border-border py-8 text-sm text-muted-foreground">
            No qualifying human-friction evidence surfaced for this market. Try another location;
            TrendSpark will not fill the gap with invented ideas.
          </p>
        )}

        <div className="mt-12 space-y-12">
          {spaces.map((space, spaceIndex) => (
            <article key={space.observation.evidenceHash} className="relative">
              <div className="grid gap-5 md:grid-cols-[11rem_minmax(0,1fr)]">
                <div>
                  <span className="inline-flex rounded-full border border-primary/30 bg-secondary px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-primary">
                    {space.observation.evidenceType}
                  </span>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    Observation {String(spaceIndex + 1).padStart(2, "0")} ·{" "}
                    {provenanceLabel(space.observation.provenance)}
                  </p>
                </div>
                <div className="min-w-0">
                  <h2 className="[overflow-wrap:anywhere] font-display text-2xl font-bold tracking-tight">
                    {space.observation.canonicalQuery}
                  </h2>
                  <blockquote className="mt-3 [overflow-wrap:anywhere] border-l border-border pl-4 text-sm leading-6 text-foreground">
                    {space.observation.evidenceText}
                  </blockquote>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{space.observation.source}</span>
                    {space.observation.evidenceUrl && (
                      <a
                        href={space.observation.evidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Check source ↗
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => void trackSignal(space)}
                      disabled={tracking === space.observation.evidenceHash}
                      className="rounded border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px disabled:opacity-50"
                    >
                      {tracking === space.observation.evidenceHash
                        ? "Tracking…"
                        : "Track this signal"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
                {space.appSeeds.slice(0, 6).map((seed) => {
                  const key = seed.sourceHash + seed.family;
                  const isSaved = saved.has(key);
                  return (
                    <section key={key} className="min-w-0 bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary">
                          {seed.family} · {provenanceLabel(seed.provenance)}
                        </span>
                        <span className="font-display text-xl font-extrabold">
                          {scoreFor(seed, lens)}
                        </span>
                      </div>
                      <h3 className="mt-3 [overflow-wrap:anywhere] font-display text-lg font-bold tracking-tight">
                        {seed.title}
                      </h3>
                      <p className="mt-2 [overflow-wrap:anywhere] text-sm leading-5 text-muted-foreground">
                        {seed.concept}
                      </p>
                      <p className="mt-3 text-xs leading-5">{seed.whyInteresting}</p>
                      <button
                        type="button"
                        onClick={() => void saveDirection(seed)}
                        disabled={isSaved}
                        className="mt-4 rounded border border-border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px disabled:border-primary/30 disabled:text-primary"
                      >
                        {isSaved ? "Saved" : "Save direction"}
                      </button>
                    </section>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
