import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { CheckItYourself } from "@/components/CheckItYourself";
import { SiteNav } from "@/components/SiteNav";
import {
  CITED_FINAL_VERSION_HINT,
  gapLabel,
  gapStory,
  gapStoryLabel,
  getAiCitationGap,
  resolveCitedUrl,
  shapeLabel,
} from "@/lib/ai-citation-gap";
import { HEAT_LEGEND, heatColor, heatIndexFromScore, heatStyle } from "@/lib/heat";
import { getBrief, type BriefResult } from "@/lib/briefs.functions";
import { listSignals, type EvidenceRow, type SignalRow } from "@/lib/signals.functions";
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

function seriesDelta(series: number[]): { pct: number; label: string } | null {
  if (series.length < 8) return null;
  const recent = series.slice(-4);
  const prior = series.slice(0, -4);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const r = mean(recent);
  const p = mean(prior);
  if (p <= 0.5) return null;
  const pct = Math.round(((r - p) / p) * 100);
  const label = pct > 0 ? `+${pct}% vs earlier` : pct < 0 ? `${pct}% vs earlier` : "flat vs earlier";
  return { pct, label };
}

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
  const { signals, evidence, lastRun } = Route.useLoaderData();
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
        !onlyAiGap || (gap != null && (gap.gap === "high" || gap.gap === "medium"));
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
                const g = getAiCitationGap(s.slug, s.keyword)?.gap;
                return g === "high" || g === "medium";
              }).length;
              return gapped > 0 ? ` · ${gapped} with AI-gap overlay` : "";
            })()}
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">
            Radar
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Demand scored against the supply already shipped · Wikipedia · GitHub · Hacker News ·
            Tavily · Sitefire AI-gap overlay
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
            <button
              type="button"
              onClick={() => setOnlyAiGap((v) => !v)}
              className={`border rounded-md px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
                onlyAiGap
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              ai-gap
            </button>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Detail
            </span>
            <div className="flex">
              {(["compact", "standard", "full"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDetail(level)}
                  className={`border rounded-md px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
                    detail === level
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                  }`}
                >
                  {level}
                </button>
              ))}
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
              const aiGap = getAiCitationGap(s.slug, s.keyword);
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
                      <span
                        className={`rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
                          aiGap.gap === "high"
                            ? "border-primary text-primary"
                            : aiGap.gap === "medium"
                              ? "border-border text-foreground"
                              : "border-border text-muted-foreground"
                        }`}
                      >
                        {gapLabel(aiGap.gap)}
                        {aiGap.status === "demo" ? " · demo" : ""}
                      </span>
                      {aiGap.citationShape ? (
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                          {shapeLabel(aiGap.citationShape)}
                        </span>
                      ) : null}
                      {!aiGap.localCited ? (
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                          no local cite
                        </span>
                      ) : null}
                      {aiGap.engineDisagreement ? (
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
                          engines disagree
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  {/* Story depends on supply: absent AI citations are whitespace only when the
                      shelf is also empty — otherwise incumbents exist but have not done GEO. */}
                  {story ? (
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {gapStoryLabel(story)}
                    </p>
                  ) : null}
                  {detail !== "compact" && (
                    <div className="mt-3">
                      <Sparkline series={s.series ?? []} heat={oppHeat} />
                    </div>
                  )}
                  <dl className="mt-3 grid grid-cols-3 gap-2 border-y border-dotted border-border py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    <div>
                      <dt>Demand</dt>
                      <dd
                        className="font-display text-lg"
                        style={{ color: heatColor(demandHeat) }}
                      >
                        {s.demand_score}
                      </dd>
                    </div>
                    <div>
                      <dt>Supply</dt>
                      <dd className="font-display text-lg text-foreground">{s.supply_score}</dd>
                    </div>
                    <div>
                      <dt>Lead</dt>
                      <dd
                        className="font-display text-lg"
                        style={{ color: heatColor(leadHeat) }}
                      >
                        {s.lead_weeks}w
                      </dd>
                    </div>
                  </dl>
                  {detail !== "compact" && (
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{s.why}</p>
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
                  {detail !== "compact" ? <CheckItYourself keyword={s.keyword} /> : null}
                  {briefError[s.slug] ? (
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                      {briefError[s.slug]}
                    </p>
                  ) : null}
                  {briefs[s.slug] ? (
                    <InlineBrief result={briefs[s.slug]!} />
                  ) : null}
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
                    <ul className="mt-3 space-y-2 border-t border-dotted border-border pt-3">
                      {rows.map((row, i) => (
                        <li key={`${row.metric}-${i}`} className="text-[13px] leading-5">
                          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                            {row.source} · {row.metric}
                            {row.value !== null ? ` · ${row.value}` : ""}
                          </span>
                          <br />
                          {row.url ? (
                            <a
                              href={row.url}
                              target="_blank"
                              rel="noreferrer"
                              className="underline decoration-dotted"
                            >
                              {row.detail}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">{row.detail}</span>
                          )}
                        </li>
                      ))}
                    </ul>
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