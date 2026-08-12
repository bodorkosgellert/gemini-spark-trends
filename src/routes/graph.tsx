import { SiteNav } from "@/components/SiteNav";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import crosswalk from "@/data/tag-crosswalk.json";
import store from "@/data/appstore-signals.json";
import { heatColor, heatIndexFromScore } from "@/lib/heat";
import { askTrendGraph } from "@/lib/cognee.functions";
import { edgesToMap, listSignalEdges } from "@/lib/edges.functions";

const SUGGESTED = [
  "Which signal has rising demand but almost no supply, and what would you build first?",
  "Which two signals share the same buyer, and could one product serve both?",
  "Which signals look crowded and should be avoided this month?",
];

function AskTheGraph() {
  const run = useServerFn(askTrendGraph);
  const [question, setQuestion] = useState("");
  const ask = useMutation({
    mutationFn: (q: string) => run({ data: { question: q } }),
  });

  const submit = (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 4) return;
    setQuestion(trimmed);
    ask.mutate(trimmed);
  };

  return (
    <section className="mt-8 rounded-lg border border-border bg-secondary/40 p-5">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
        Ask the graph
      </h2>
      <p className="mt-2 text-[15px] leading-7">
        The rings above are a fixed map. Underneath, every scored signal and its evidence is also
        written into a knowledge graph, so you can ask it questions the table cannot answer.
      </p>
      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          submit(question);
        }}
      >
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Which unbuilt market sits next to a rising tag?"
          className="flex-1 border border-border bg-background px-3 py-2 font-mono text-[12px] outline-none placeholder:text-muted-foreground focus:border-accent"
        />
        <button
          type="submit"
          disabled={ask.isPending}
          className="border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
        >
          {ask.isPending ? "Traversing…" : "Ask"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTED.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => submit(s)}
            className="border border-dotted border-border px-2 py-1 text-left font-mono text-[10px] text-muted-foreground hover:border-primary hover:text-primary"
          >
            {s}
          </button>
        ))}
      </div>

      {ask.isPending && (
        <p className="mt-4 text-sm text-muted-foreground">
          Walking the graph — this takes a moment on a cold traversal…
        </p>
      )}
      {ask.error && (
        <p className="mt-4 border-l-2 border-primary pl-3 text-[15px] leading-7">
          {(ask.error as Error).message}
        </p>
      )}
      {ask.data && !ask.isPending && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="whitespace-pre-wrap text-[15px] leading-7">{ask.data.answer}</p>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Answered from the live signal graph
          </p>
        </div>
      )}
    </section>
  );
}

export const Route = createFileRoute("/graph")({
  loader: () => listSignalEdges(),
  component: GraphExplorer,
  head: () => ({
    meta: [
      { title: "The Web — how demand tags connect to app markets | TrendSpark" },
      {
        name: "description",
        content:
          "A graph of 23 demand tags wired to 25 App Store markets: which attention themes lead which shelves, how crowded each market is, and where a lead time meets an unbuilt market.",
      },
      { property: "og:title", content: "The Web — demand tags wired to app markets" },
      {
        property: "og:description",
        content:
          "Click any tag or market to trace its neighbourhood: correlation, lead weeks, supply, incumbent lock and the openings in between.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type TagRow = (typeof crosswalk.rows)[number];
type MarketRow = (typeof store.rows)[number];

// Fallback only. `signal_edges` in Postgres is the source of truth (Approach C); this map
// keeps the page renderable before the migration is applied or if the key is cold.
// Hand-mapped from the tag vocabulary used in the Crosswalk study; an edge means "a builder
// working this tag would ship into this market".
const FALLBACK_EDGES: Record<string, string[]> = {
  agents: ["ai agent", "rag chatbot", "note taking ai"],
  developer: ["ai agent", "rag chatbot", "password manager"],
  local: ["local events", "public transport", "repair cafe", "cycling navigation", "dog walking"],
  privacy: ["privacy vpn", "password manager", "receipt scanner", "budget tracking"],
  protocol: ["ev charging", "password manager"],
  video: ["language learning", "recipe scanner"],
  automation: ["invoice freelancer", "habit tracker", "meal planning", "energy tracker"],
  data: ["energy tracker", "sleep tracker", "budget tracking"],
  voice: ["note taking ai", "language learning"],
  hardware: ["balcony solar", "heat pump", "ev charging", "energy tracker"],
  crypto: ["invoice freelancer", "budget tracking"],
  search: ["recipe scanner", "second hand clothes"],
  b2b: ["invoice freelancer", "receipt scanner", "password manager"],
  creator: ["note taking ai", "local events"],
  compliance: ["receipt scanner", "invoice freelancer"],
  payments: ["budget tracking", "invoice freelancer", "car sharing"],
  services: ["dog walking", "repair cafe", "car sharing"],
  smb: ["invoice freelancer", "receipt scanner"],
  finance: ["budget tracking", "receipt scanner"],
  community: ["local events", "repair cafe", "second hand clothes"],
  commerce: ["second hand clothes", "meal planning"],
  climate: ["balcony solar", "heat pump", "ev charging", "public transport", "repair cafe"],
  "supply-chain": ["second hand clothes", "ev charging"],
};

const R_OUT = 300;
const R_IN = 168;

function polar(i: number, n: number, r: number) {
  const a = (i / n) * Math.PI * 2 - Math.PI / 2;
  // Round so the SSR string and the client string are byte-identical.
  const round = (v: number) => Math.round(v * 100) / 100;
  return { x: round(Math.cos(a) * r), y: round(Math.sin(a) * r), a: round(a) };
}

const COUNTRY_NAMES: Record<string, string> = {
  de: "Germany",
  fr: "France",
  gb: "United Kingdom",
  es: "Spain",
  it: "Italy",
  nl: "Netherlands",
};

type GeoScope = "all" | keyof typeof COUNTRY_NAMES;

function localHits(m: MarketRow, geo: Exclude<GeoScope, "all">): number {
  const pc = m.perCountry as Record<string, number> | undefined;
  return pc?.[geo] ?? 0;
}

function GraphExplorer() {
  const { edges: edgeRows, source: edgeSource } = Route.useLoaderData();
  const [focus, setFocus] = useState<string | null>(null);
  const [leadingOnly, setLeadingOnly] = useState(false);
  /** Storefront lens — re-weights outer nodes by one country; does not explode the graph. */
  const [geo, setGeo] = useState<GeoScope>("all");

  // Table wins when it has rows; otherwise the in-file map keeps the rings drawn.
  const EDGES = useMemo(
    () => (edgeSource === "table" ? edgesToMap(edgeRows) : FALLBACK_EDGES),
    [edgeRows, edgeSource],
  );

  const tags = useMemo(() => {
    const rows = crosswalk.rows as TagRow[];
    const kept = leadingOnly ? rows.filter((r) => r.p <= 0.1 && r.r > 0) : rows;
    return [...kept].sort((a, b) => b.app_launches - a.app_launches);
  }, [leadingOnly]);

  const markets = useMemo(() => {
    const rows = [...(store.rows as MarketRow[])];
    if (geo === "all") return rows.sort((a, b) => b.opportunity - a.opportunity);
    return rows
      .filter((m) => localHits(m, geo) > 0)
      .sort((a, b) => localHits(b, geo) - localHits(a, geo));
  }, [geo]);

  const tagPos = useMemo(
    () => new Map(tags.map((t, i) => [t.tag, polar(i, tags.length, R_IN)])),
    [tags],
  );
  const marketPos = useMemo(
    () => new Map(markets.map((m, i) => [m.query, polar(i, markets.length, R_OUT)])),
    [markets],
  );

  const links = useMemo(() => {
    const out: { tag: string; market: string }[] = [];
    for (const t of tags)
      for (const m of EDGES[t.tag] ?? []) if (marketPos.has(m)) out.push({ tag: t.tag, market: m });
    return out;
  }, [tags, marketPos, EDGES]);

  const neighbours = useMemo(() => {
    if (!focus) return null;
    const set = new Set<string>([focus]);
    for (const l of links) {
      if (l.tag === focus) set.add(l.market);
      if (l.market === focus) set.add(l.tag);
    }
    return set;
  }, [focus, links]);

  const dim = (id: string) => (neighbours && !neighbours.has(id) ? 0.12 : 1);

  const focusTag = tags.find((t) => t.tag === focus) ?? null;
  const focusMarket = markets.find((m) => m.query === focus) ?? null;

  const maxLaunch = Math.max(...tags.map((t) => t.app_launches), 1);
  const maxOpp = Math.max(...markets.map((m) => m.opportunity), 1);
  const maxLocal = Math.max(
    ...markets.map((m) => (geo === "all" ? m.opportunity : localHits(m, geo))),
    1,
  );
  const maxR = Math.max(...tags.map((t) => t.r), 0.01);

  const tagHeat = (t: TagRow) => Math.min(4, Math.floor((t.app_launches / maxLaunch) * 4));
  const marketHeat = (m: MarketRow) =>
    geo === "all"
      ? heatIndexFromScore(m.opportunity)
      : Math.min(4, Math.floor((localHits(m, geo) / maxLocal) * 4));
  const marketRadius = (m: MarketRow) => {
    if (geo === "all") return 8 + (m.opportunity / maxOpp) * 18;
    return 8 + (localHits(m, geo) / maxLocal) * 18;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <div className="mx-auto max-w-5xl px-5 pb-24 pt-8">
        <header>
          
          <h1 className="mt-5 font-display text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">
            The Web
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Every demand tag wired to the app markets it would ship into
            {geo === "all"
              ? ""
              : ` · outer ring sized by ${COUNTRY_NAMES[geo]} storefront hits`}
          </p>
          <div className="mt-4 border-y border-border py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {tags.length} tags · {markets.length} markets · {links.length} edges
            {edgeSource === "table" ? " · edges from Postgres" : " · edges from fallback map"}
          </div>
        </header>

        <section className="mt-8 grid gap-6 border-b border-border pb-6 md:grid-cols-[2fr_1fr]">
          <p className="text-[16px] leading-7">
            The Crosswalk told us which themes attention moves ahead of. The Store Ledger told us
            which shelves are already full. Neither is useful alone: a tag that leads by three weeks
            is worthless if it lands in a market three incumbents have locked, and an empty shelf is
            worthless if nobody is looking at it. This page joins the two. The inner ring is the tag
            vocabulary, sized by how many launches carried it; the outer ring is the App Store
            markets, sized by opportunity. Click anything to isolate its neighbourhood.
          </p>
          <aside className="border-l border-dotted border-border pl-5 font-mono text-[11px] leading-6 text-muted-foreground">
            <p className="mb-2 uppercase tracking-[0.25em] text-foreground">Reading the web</p>
            <p>
              <span className="text-foreground">Filled inner node</span> — the tag leads attention
              (positive r, p ≤ 0.1).
            </p>
            <p className="mt-2">
              <span className="text-foreground">Hollow inner node</span> — coincident or trailing;
              treat as crowding, not foresight.
            </p>
            <p className="mt-2">
              <span className="text-foreground">Outer node size</span> — opportunity score: proven
              demand divided by fresh supply and incumbent lock.
            </p>
            <p className="mt-2">
              <span className="text-foreground">Best cells</span> — a filled tag joined to a large
              outer node: a lead time pointing at an unbuilt shelf.
            </p>
            <p className="mt-2">
              <span className="text-foreground">Storefront</span> — pick a country to re-weight the
              outer ring by that storefront’s hit counts (same markets, different lens). Not a
              continent drill-down — we only have six EU storefronts in the ledger.
            </p>
          </aside>
        </section>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Storefront
          </span>
          <button
            type="button"
            onClick={() => setGeo("all")}
            className={`border rounded-md px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
              geo === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            All six
          </button>
          {(Object.keys(COUNTRY_NAMES) as (keyof typeof COUNTRY_NAMES)[]).map((cc) => (
            <button
              key={cc}
              type="button"
              onClick={() => setGeo(cc)}
              className={`border rounded-md px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
                geo === cc
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {cc}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setLeadingOnly(!leadingOnly)}
            className={`border rounded-md px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
              leadingOnly
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            Leading tags only
          </button>
          <button
            type="button"
            onClick={() => setFocus(null)}
            className="border border-border rounded-md px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            Clear focus
          </button>
          {focus && (
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
              Focused: {focus}
            </span>
          )}
        </div>

        <div className="mt-6 overflow-x-auto border-y border-border py-4">
          <svg viewBox="-380 -380 760 760" className="mx-auto h-[640px] w-full max-w-[760px]">
            {links.map((l, i) => {
              const a = tagPos.get(l.tag)!;
              const b = marketPos.get(l.market)!;
              const active = !neighbours || (neighbours.has(l.tag) && neighbours.has(l.market));
              const m = markets.find((x) => x.query === l.market)!;
              return (
                <path
                  key={i}
                  d={`M${a.x},${a.y} Q0,0 ${b.x},${b.y}`}
                  fill="none"
                  stroke={heatColor(marketHeat(m))}
                  strokeWidth={active && neighbours ? 1.4 : 0.6}
                  opacity={active ? (neighbours ? 0.55 : 0.22) : 0.06}
                />
              );
            })}

            {markets.map((m) => {
              const p = marketPos.get(m.query)!;
              const r = marketRadius(m) * 0.55;
              const deg = (p.a * 180) / Math.PI;
              const flip = p.x < 0;
              return (
                <g key={m.query} opacity={dim(m.query)}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={r}
                    className="cursor-pointer"
                    style={{ fill: heatColor(marketHeat(m)) }}
                    onClick={() => setFocus(focus === m.query ? null : m.query)}
                  />
                  <text
                    transform={`translate(${p.x},${p.y}) rotate(${flip ? deg + 180 : deg}) translate(${flip ? -(r + 6) : r + 6},3)`}
                    textAnchor={flip ? "end" : "start"}
                    className="cursor-pointer fill-current font-mono text-[9px] uppercase tracking-[0.12em]"
                    onClick={() => setFocus(focus === m.query ? null : m.query)}
                  >
                    {m.query}
                  </text>
                </g>
              );
            })}

            {tags.map((t) => {
              const p = tagPos.get(t.tag)!;
              const leads = t.r > 0 && t.p <= 0.1;
              const r = 3 + (t.app_launches / maxLaunch) * 10;
              const rHeat = Math.min(4, Math.floor((Math.max(0, t.r) / maxR) * 4));
              return (
                <g
                  key={t.tag}
                  opacity={dim(t.tag)}
                  className="cursor-pointer"
                  onClick={() => setFocus(focus === t.tag ? null : t.tag)}
                >
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={r}
                    stroke="currentColor"
                    strokeWidth={1.2}
                    style={{ fill: leads ? heatColor(rHeat) : undefined }}
                    className={leads ? "fill-current" : "fill-background"}
                  />
                  <text
                    x={p.x}
                    y={p.y - r - 5}
                    textAnchor="middle"
                    className="fill-current font-mono text-[9px] uppercase tracking-[0.12em]"
                  >
                    {t.tag}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <AskTheGraph />

        {(focusTag || focusMarket) && (
          <section className="mt-6 border-b border-border pb-6">
            {focusTag && (
              <div>
                <h2 className="font-display text-3xl font-extrabold capitalize">{focusTag.tag}</h2>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {focusTag.app_launches} launches · r {focusTag.r.toFixed(2)} · p{" "}
                  {focusTag.p.toFixed(3)} · lead {focusTag.lead_weeks}w
                </p>
                <p className="mt-3 max-w-2xl text-[15px] leading-7">
                  {focusTag.p <= 0.05 && focusTag.r > 0
                    ? "Attention moves before the launches at conventional significance — the strongest kind of row on this page."
                    : focusTag.r > 0 && focusTag.lead_weeks === 0
                      ? "Coincident with attention: builders and audience arrive together, which reads as crowding rather than foresight."
                      : "Weak or negative association on nine weekly points — a hint, not a finding."}
                </p>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {(EDGES[focusTag.tag] ?? []).map((q) => {
                    const m = markets.find((x) => x.query === q);
                    if (!m) return null;
                    return (
                      <li key={q} className="border-t border-dotted border-border pt-2">
                        <button
                          type="button"
                          onClick={() => setFocus(q)}
                          className="font-display text-lg font-bold capitalize hover:text-primary"
                        >
                          {q}
                        </button>
                        <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                          opp {m.opportunity} · lock {Math.round(m.top3Share * 100)}% · fresh{" "}
                          {Math.round(m.freshRate * 100)}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {focusMarket && (
              <div>
                <h2 className="font-display text-3xl font-extrabold capitalize">{focusMarket.query}</h2>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  opportunity {focusMarket.opportunity} · {focusMarket.supply} listings ·{" "}
                  {Math.round(focusMarket.freshRate * 100)}% fresh · top-3 hold{" "}
                  {Math.round(focusMarket.top3Share * 100)}% ·{" "}
                  {focusMarket.demandPerFresh.toLocaleString("en-US")} ratings per new entrant
                  {geo !== "all"
                    ? ` · ${COUNTRY_NAMES[geo]} hits ${localHits(focusMarket, geo)}`
                    : ""}
                </p>
                <p className="mt-3 max-w-2xl text-[15px] leading-7">
                  Tags feeding this shelf:{" "}
                  {tags
                    .filter((t) => (EDGES[t.tag] ?? []).includes(focusMarket.query))
                    .map((t) => `${t.tag} (${t.lead_weeks}w lead, r ${t.r.toFixed(2)})`)
                    .join(", ") || "none in the current filter"}
                  .
                </p>
                <ul className="mt-4 space-y-2">
                  {focusMarket.top.slice(0, 4).map((app, i) => (
                    <li key={i} className="text-[13px] leading-5">
                      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                        {app.ratings.toLocaleString("en-US")} ratings · released {app.released}
                      </span>
                      <br />
                      {app.name}
                      <span className="text-muted-foreground"> — {app.seller}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <section className="mt-10">
          <h2 className="font-display text-3xl font-extrabold">The cells worth building</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-muted-foreground">
            Every edge where the tag leads attention (positive r, p ≤ 0.1) and the market still
            scores above forty on opportunity. This is the shortlist the rest of the paper exists to
            produce.
          </p>
          <div className="mt-5 border-t border-border">
            {links
              .map((l) => ({
                tag: (crosswalk.rows as TagRow[]).find((t) => t.tag === l.tag)!,
                market: markets.find((m) => m.query === l.market)!,
              }))
              .filter((c) => c.tag && c.market && c.tag.r > 0 && c.tag.p <= 0.1)
              .filter((c) => c.market.opportunity >= 40)
              .sort(
                (a, b) =>
                  b.market.opportunity * (1 + b.tag.lead_weeks) -
                  a.market.opportunity * (1 + a.tag.lead_weeks),
              )
              .map((c, i) => (
                <div
                  key={i}
                  className="grid grid-cols-2 items-baseline gap-3 border-b border-border py-3 md:grid-cols-[1fr_1fr_1fr_1fr]"
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
                    {c.tag.tag}
                  </span>
                  <span className="font-display text-xl font-bold capitalize">
                    {c.market.query}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    lead {c.tag.lead_weeks}w · r {c.tag.r.toFixed(2)}
                  </span>
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.15em] md:text-right"
                    style={{ color: heatColor(marketHeat(c.market)) }}
                  >
                    opp {c.market.opportunity} · lock {Math.round(c.market.top3Share * 100)}%
                  </span>
                </div>
              ))}
          </div>
        </section>

        <footer className="mt-12 border-t border-border pt-5 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Joined from the Crosswalk study ({crosswalk.launchesScanned.toLocaleString("en-US")} launches)
            and the Store Ledger ({new Date(store.generatedAt).toUTCString().slice(5, 16)}) · edges
            {edgeSource === "table"
              ? ` from signal_edges (${edgeRows.length} rows)`
              : " from the in-file fallback map"}
            , hand-mapped, not inferred
          </p>
        </footer>
      </div>
    </div>
  );
}
