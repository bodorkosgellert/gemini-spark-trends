import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";

import { CheckItYourself } from "@/components/CheckItYourself";
import { EvidenceList } from "@/components/EvidenceList";
import { LocalGlobalChart } from "@/components/LocalGlobalChart";
import { useGeo } from "@/components/geo-context";
import { SiteNav } from "@/components/SiteNav";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AI_GAP_FILTER_EXPLANATION,
  CITED_FINAL_VERSION_HINT,
  ENGINE_DISAGREEMENT_EXPLANATION,
  LOCAL_CITE_EXPLANATION,
  gapExplanation,
  gapLabel,
  gapStory,
  gapStoryExplanation,
  gapStoryLabel,
  getAiCitationGap,
  resolveCitedUrl,
  shapeExplanation,
  shapeLabel,
} from "@/lib/ai-citation-gap";
import { HEAT_LEGEND, heatColor, heatIndexFromScore, heatStyle } from "@/lib/heat";
import { getBrief, type BriefResult } from "@/lib/briefs.functions";
import {
  listMarketContext,
  listSignals,
  type EvidenceRow,
  type MarketSnapshotRow,
  type SignalOpportunityContext,
  type SignalRow,
} from "@/lib/signals.functions";
import { calculateMarketDelta, geoLabel, marketScopeLabel } from "@/lib/geo.types";
import { seriesDelta } from "@/lib/series";
import { ALL_TAGS } from "@/lib/watchlist";

export const Route = createFileRoute("/radar")({
  loader: () => listSignals(),
  component: Radar,
  errorComponent: () => (
    <div className="min-h-screen bg-background p-10 text-center font-display text-2xl">
      The presses jammed. Reload to try this edition again.
    </div>
  ),
  head: () => ({
    meta: [
      { title: "The Radar — live demand signals | TrendSpark" },
      {
        name: "description",
        content:
          "Search live demand signals scored from Google Trends, GitHub, Hacker News and Reddit. Filter by tag to find demand nobody has built for yet.",
      },
      { property: "og:title", content: "The Radar — live demand signals" },
      {
        property: "og:description",
        content:
          "Demand, supply and opportunity scores for emerging categories, refreshed from four public sources.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Sparkline({ series, heat = 2 }: { series: number[]; heat?: number }) {
  if (series.length < 4) return null;
  const max = Math.max(...series, 1);
  const min = Math.min(...series, 0);
  const span = Math.max(max - min, 1);
  const points = series
    .map((v, i) => `${(i / (series.length - 1)) * 100},${26 - ((v - min) / span) * 22}`)
    .join(" ");
  const delta = seriesDelta(series);
  return (
    <div>
      <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-8 w-full" aria-hidden>
        <polyline
          points={points}
          fill="none"
          stroke={heatColor(heat)}
          strokeWidth={1.5 + heat * 0.25}
        />
      </svg>
      {delta ? (
        <p
          className={`mt-1 font-mono text-[10px] uppercase tracking-[0.14em] ${
            delta.pct > 0 ? "text-primary" : "text-muted-foreground"
          }`}
        >
          Signal change · {delta.label}
        </p>
      ) : null}
    </div>
  );
}

function Radar() {
  return <RadarPage />;
}

function InlineBrief({ result }: { result: BriefResult }) {
  const b = result.brief;
  const List = ({ title, items }: { title: string; items: string[] }) =>
    items?.length ? (
      <div className="mt-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {title}
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-[13px] leading-5">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    ) : null;

  return (
    <div className="mt-4 border-t border-dotted border-border pt-3">
      <p className="font-display text-lg font-bold leading-tight">{b.headline}</p>
      <p className="mt-1 text-[14px] leading-6 text-muted-foreground">{b.one_liner}</p>
      <List title="Hero flow" items={b.hero_flow} />
      <div className="mt-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Who pays
        </p>
        <p className="text-[13px] leading-5">{b.who_pays}</p>
        <p className="mt-1 text-[13px] leading-5">{b.pricing}</p>
      </div>
      <List title="First week" items={b.first_week} />
      <List title="Domain knowledge" items={b.domain_knowledge} />
      <List title="Why this dies" items={b.why_this_dies} />
      <div className="mt-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Disproof
        </p>
        <p className="text-[13px] leading-5">{b.disproof}</p>
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
          Copyable build prompt
        </summary>
        <pre className="mt-2 whitespace-pre-wrap border border-dotted border-border p-2 text-[12px] leading-5">
          {b.build_prompt}
        </pre>
      </details>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {result.cached ? "Cached brief" : "Freshly generated"}
      </p>
    </div>
  );
}

function RadarPage() {
  const { signals: baseSignals, evidence, lastRun } = Route.useLoaderData();
  const { selection, geoKey } = useGeo();
  const loadMarket = useServerFn(listMarketContext);
  const marketQuery = useQuery({
    queryKey: ["radar-market", geoKey],
    queryFn: () => loadMarket({ data: { geoKey, countryCode: selection.countryCode } }),
    staleTime: 5 * 60_000,
  });
  const marketSnapshots = marketQuery.data?.snapshots as
    Record<string, MarketSnapshotRow> | undefined;
  const baselineSnapshots = marketQuery.data?.baselines as
    Record<string, MarketSnapshotRow> | undefined;
  const globalSnapshots = marketQuery.data?.globals as
    Record<string, MarketSnapshotRow> | undefined;
  const opportunityContext = (marketQuery.data?.opportunities ?? {}) as Record<
    string,
    SignalOpportunityContext
  >;
  const signals = useMemo(
    () =>
      baseSignals.map((signal) => {
        const snapshot = marketSnapshots?.[signal.id];
        return snapshot
          ? {
              ...signal,
              demand_score: snapshot.demand_score,
              supply_score: snapshot.supply_score,
              opportunity_score: snapshot.opportunity_score,
              momentum: snapshot.momentum,
              lead_weeks: snapshot.lead_weeks,
              series: snapshot.series,
            }
          : signal;
      }),
    [baseSignals, marketSnapshots],
  );
  const [query, setQuery] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [onlyAiGap, setOnlyAiGap] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [detail, setDetail] = useState<"compact" | "standard" | "full">("standard");
  const [briefs, setBriefs] = useState<Record<string, BriefResult>>({});
  const [loadingBrief, setLoadingBrief] = useState<string | null>(null);
  const [briefError, setBriefError] = useState<Record<string, string>>({});
  /** Per-signal hint when a cited brand has no resolvable URL yet (demo / final-version). */
  const [citeHint, setCiteHint] = useState<Record<string, string>>({});

  const loadBrief = async (slug: string) => {
    if (briefs[slug]) {
      setBriefs((prev) => {
        const next = { ...prev };
        delete next[slug];
        return next;
      });
      return;
    }
    setLoadingBrief(slug);
    setBriefError((prev) => ({ ...prev, [slug]: "" }));
    try {
      const result = await getBrief({ data: { slug } });
      setBriefs((prev) => ({ ...prev, [slug]: result }));
    } catch (error) {
      setBriefError((prev) => ({ ...prev, [slug]: (error as Error).message }));
    } finally {
      setLoadingBrief(null);
    }
  };

  const evidenceBySignal = useMemo(() => {
    const map = new Map<string, EvidenceRow[]>();
    for (const row of evidence) {
      const list = map.get(row.signal_id) ?? [];
      list.push(row);
      map.set(row.signal_id, list);
    }
    return map;
  }, [evidence]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return signals.filter((s: SignalRow) => {
      const matchesQuery =
        q === "" ||
        s.keyword.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.why ?? "").toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q));
      const matchesTags = tags.length === 0 || tags.every((t) => s.tags.includes(t));
      const gap = getAiCitationGap(s.slug, s.keyword);
      const matchesGap =
        !onlyAiGap ||
        (gap != null && gap.status !== "demo" && (gap.gap === "high" || gap.gap === "medium"));
      return matchesQuery && matchesTags && matchesGap;
    });
  }, [signals, query, tags, onlyAiGap]);

  const toggleTag = (tag: string) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <div className="mx-auto max-w-6xl px-5 pb-24 pt-10">
        <header>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
            {lastRun?.finished_at
              ? `Last run ${new Date(lastRun.finished_at).toUTCString().slice(5, 22)} UTC`
              : "Awaiting first run"}
            {" · "}
            {signals.length} signals
            {(() => {
              const gapped = signals.filter((s) => {
                const result = getAiCitationGap(s.slug, s.keyword);
                return (
                  result?.status !== "demo" && (result?.gap === "high" || result?.gap === "medium")
                );
              }).length;
              return gapped > 0 ? ` · ${gapped} with AI-gap overlay` : "";
            })()}
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">
            Radar
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {marketQuery.data?.available && Object.keys(marketSnapshots ?? {}).length > 0
              ? `${geoLabel(selection)} snapshots · unmatched rows retain canonical fallback scores`
              : `${geoLabel(selection)} selected · country/global fallback until this market is ingested`}
            {Object.keys(globalSnapshots ?? {}).length > 0
              ? " · local vs global interest after ingest"
              : ""}
            {" · "}Wikipedia · GitHub · Hacker News · Tavily · Sitefire AI-gap overlay
          </p>
          <div className="mt-5 flex items-center gap-2">
            {HEAT_LEGEND.map((l) => (
              <div key={l.label} className="text-center">
                <div className="h-5 w-10 rounded-sm border" style={heatStyle(l.index)} />
                <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                  {l.label}
                </span>
              </div>
            ))}
            <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Colour = score intensity
            </span>
          </div>
        </header>

        <section className="mt-8 border-b border-border pb-6">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Search the wire
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="voice, compliance, agents…"
              className="mt-2 w-full border-b-2 border-primary bg-transparent pb-2 font-display text-2xl outline-none placeholder:text-muted-foreground/60"
            />
          </label>
          <div className="mt-5 flex flex-wrap gap-2">
            {ALL_TAGS.map((tag) => {
              const active = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`border rounded-md px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setOnlyAiGap((v) => !v)}
                  aria-pressed={onlyAiGap}
                  className={`border rounded-md px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    onlyAiGap
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                  }`}
                >
                  ai-gap
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-72 normal-case leading-5">
                {AI_GAP_FILTER_EXPLANATION}
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Detail
            </span>
            <div className="flex">
              {(["compact", "standard", "full"] as const).map((level) => {
                const description =
                  level === "compact"
                    ? "Scores and labels only."
                    : level === "standard"
                      ? "Adds evidence summaries and signal history."
                      : "Keeps every card expanded with its full evidence.";
                return (
                  <Tooltip key={level}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setDetail(level)}
                        aria-pressed={detail === level}
                        className={`border rounded-md px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          detail === level
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                        }`}
                      >
                        {level}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{description}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        </section>

        {signals.length === 0 ? (
          <p className="mt-12 text-center text-base text-muted-foreground">
            The wire is empty. Run the ingest hook to file the first edition.
          </p>
        ) : (
          <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((s: SignalRow) => {
              const rows = evidenceBySignal.get(s.id) ?? [];
              const opportunity = opportunityContext[s.id];
              const snapshot = marketSnapshots?.[s.id];
              const baseline = baselineSnapshots?.[s.id];
              const marketDelta = calculateMarketDelta(
                snapshot?.opportunity_score,
                baseline?.opportunity_score,
              );
              const rawAiGap = getAiCitationGap(s.slug, s.keyword);
              const aiGap = rawAiGap?.status === "demo" ? null : rawAiGap;
              const story = aiGap ? gapStory(aiGap.gap, s.supply_score) : null;
              const isOpen = detail === "full" ? open !== `closed-${s.id}` : open === s.id;
              const oppHeat = heatIndexFromScore(s.opportunity_score);
              const demandHeat = heatIndexFromScore(s.demand_score);
              const leadHeat = Math.min(4, Math.floor(s.lead_weeks / 2));
              return (
                <article
                  key={s.id}
                  className="rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-[0_1px_24px_-10px_var(--heat-4)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      {s.category}
                    </span>
                    <span
                      className="rounded-sm border px-2 py-0.5 font-mono text-sm font-semibold"
                      style={heatStyle(oppHeat)}
                    >
                      {s.opportunity_score}
                    </span>
                  </div>
                  <h2 className="mt-2 font-display text-xl font-bold capitalize leading-snug tracking-tight">
                    {s.keyword}
                  </h2>
                  {aiGap ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            tabIndex={0}
                            className={`cursor-help rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              aiGap.gap === "high"
                                ? "border-primary text-primary"
                                : aiGap.gap === "medium"
                                  ? "border-border text-foreground"
                                  : "border-border text-muted-foreground"
                            }`}
                          >
                            {gapLabel(aiGap.gap)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-72 normal-case leading-5">
                          {gapExplanation(aiGap.gap)}
                        </TooltipContent>
                      </Tooltip>
                      {aiGap.citationShape ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              tabIndex={0}
                              className="cursor-help font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {shapeLabel(aiGap.citationShape)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-72 normal-case leading-5">
                            {shapeExplanation(aiGap.citationShape)}
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                      {!aiGap.localCited ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              tabIndex={0}
                              className="cursor-help font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              no local cite
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-72 normal-case leading-5">
                            {LOCAL_CITE_EXPLANATION}
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                      {aiGap.engineDisagreement ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              tabIndex={0}
                              className="cursor-help font-mono text-[10px] uppercase tracking-[0.14em] text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              engines disagree
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-72 normal-case leading-5">
                            {ENGINE_DISAGREEMENT_EXPLANATION}
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
                  ) : null}
                  {/* Story depends on supply: absent AI citations are whitespace only when the
                      shelf is also empty — otherwise incumbents exist but have not done GEO. */}
                  {story ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p
                          tabIndex={0}
                          className="mt-2 w-fit cursor-help font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {gapStoryLabel(story)}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-72 normal-case leading-5">
                        {gapStoryExplanation(story)}
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                  {detail !== "compact" && (
                    <div className="mt-3">
                      <Sparkline series={s.series ?? []} heat={oppHeat} />
                      {globalSnapshots?.[s.id]?.series ? (
                        <LocalGlobalChart
                          localLabel={selection.city || selection.countryName}
                          localSeries={s.series ?? []}
                          globalSeries={globalSnapshots[s.id]!.series}
                        />
                      ) : null}
                    </div>
                  )}
                  <dl className="mt-3 grid grid-cols-3 gap-2 border-y border-dotted border-border py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    <div>
                      <dt>Demand</dt>
                      <dd className="font-display text-lg" style={{ color: heatColor(demandHeat) }}>
                        {s.demand_score}
                      </dd>
                    </div>
                    <div>
                      <dt>Supply</dt>
                      <dd className="font-display text-lg text-foreground">{s.supply_score}</dd>
                    </div>
                    <div>
                      <dt>Lead</dt>
                      <dd className="font-display text-lg" style={{ color: heatColor(leadHeat) }}>
                        {s.lead_weeks}w
                      </dd>
                    </div>
                  </dl>
                  {detail !== "compact" && (
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{s.why}</p>
                  )}
                  {detail !== "compact" && (
                    <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      <span className="border border-border px-2 py-1">
                        {snapshot
                          ? marketScopeLabel(snapshot.measurement_scope)
                          : "global fallback"}
                      </span>
                      {snapshot &&
                      baseline &&
                      snapshot.geo_key !== baseline.geo_key &&
                      marketDelta != null ? (
                        <span className="border border-primary/40 px-2 py-1 text-primary">
                          local Δ {marketDelta >= 0 ? "+" : ""}
                          {marketDelta}
                        </span>
                      ) : null}
                      {opportunity ? (
                        <>
                          <span className="border border-border px-2 py-1">
                            {opportunity.observationCount} observations
                          </span>
                          <span className="border border-border px-2 py-1">
                            {opportunity.appSeedCount} directions
                          </span>
                          {opportunity.workaround ? (
                            <span className="border border-border px-2 py-1 normal-case tracking-normal">
                              workaround: {opportunity.workaround}
                            </span>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  )}
                  {detail !== "compact" && aiGap ? (
                    <div className="mt-2 text-[13px] leading-5 text-muted-foreground">
                      <Link
                        to="/brief/$slug"
                        params={{ slug: s.slug }}
                        className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary hover:underline"
                        title="Open signal build brief"
                      >
                        AI citation · {aiGap.prompt.slice(0, 72)}
                        {aiGap.prompt.length > 72 ? "…" : ""}
                      </Link>
                      <p className="mt-1">{aiGap.note}</p>
                      {aiGap.cited.length ? (
                        <p className="mt-1">
                          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                            Cited ·{" "}
                          </span>
                          {aiGap.cited.slice(0, 3).map((c, i) => {
                            const url = resolveCitedUrl(c);
                            const sep = i < Math.min(aiGap.cited.length, 3) - 1 ? ", " : "";
                            if (url) {
                              return (
                                <span key={c}>
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary underline-offset-2 hover:underline"
                                  >
                                    {c}
                                  </a>
                                  {sep}
                                </span>
                              );
                            }
                            return (
                              <span key={c}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCiteHint((prev) => ({
                                      ...prev,
                                      [s.id]: CITED_FINAL_VERSION_HINT,
                                    }))
                                  }
                                  className="text-primary underline-offset-2 hover:underline"
                                  title="No live domain yet"
                                >
                                  {c}
                                </button>
                                {sep}
                              </span>
                            );
                          })}
                          .
                        </p>
                      ) : (
                        <p className="mt-1">No strong product citations.</p>
                      )}
                      {citeHint[s.id] ? (
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-primary">
                          {citeHint[s.id]}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
                    {s.tags.join(" · ")}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void loadBrief(s.slug)}
                      disabled={loadingBrief === s.slug}
                      className="border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                    >
                      {loadingBrief === s.slug
                        ? "Writing brief…"
                        : briefs[s.slug]
                          ? "Hide brief"
                          : "Build brief"}
                    </button>
                    <Link
                      to="/brief/$slug"
                      params={{ slug: s.slug }}
                      className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary hover:underline"
                    >
                      Full page →
                    </Link>
                  </div>
                  {detail !== "compact" ? (
                    <CheckItYourself keyword={s.keyword} geo={selection.countryCode} />
                  ) : null}
                  {briefError[s.slug] ? (
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                      {briefError[s.slug]}
                    </p>
                  ) : null}
                  {briefs[s.slug] ? <InlineBrief result={briefs[s.slug]!} /> : null}
                  {detail !== "compact" && (
                    <button
                      type="button"
                      onClick={() =>
                        detail === "full"
                          ? setOpen(isOpen ? `closed-${s.id}` : null)
                          : setOpen(isOpen ? null : s.id)
                      }
                      className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-primary hover:underline"
                    >
                      {isOpen ? "Hide evidence" : `Evidence (${rows.length})`}
                    </button>
                  )}
                  {detail !== "compact" && isOpen && (
                    <EvidenceList rows={rows} keyword={s.keyword} geo={selection.countryCode} />
                  )}
                </article>
              );
            })}
          </div>
        )}

        {signals.length > 0 && visible.length === 0 && (
          <p className="mt-12 text-center text-base text-muted-foreground">
            Nothing on the wire matches that. Try fewer tags.
          </p>
        )}

        <footer className="mt-16 border-t border-border pt-5 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Opportunity = demand discounted by the tooling already shipped. Not investment advice.
          </p>
        </footer>
      </div>
    </div>
  );
}
