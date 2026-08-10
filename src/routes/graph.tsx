import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import crosswalk from "@/data/tag-crosswalk.json";
import store from "@/data/appstore-signals.json";

export const Route = createFileRoute("/graph")({
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

// Which demand tags plausibly feed which App Store shelf. Hand-mapped from the
// tag vocabulary used in the Crosswalk study; an edge means "a builder working
// this tag would ship into this market".
const EDGES: Record<string, string[]> = {
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

function GraphExplorer() {
  const [focus, setFocus] = useState<string | null>(null);
  const [leadingOnly, setLeadingOnly] = useState(false);

  const tags = useMemo(() => {
    const rows = crosswalk.rows as TagRow[];
    const kept = leadingOnly ? rows.filter((r) => r.p <= 0.1 && r.r > 0) : rows;
    return [...kept].sort((a, b) => b.app_launches - a.app_launches);
  }, [leadingOnly]);

  const markets = useMemo(
    () => [...(store.rows as MarketRow[])].sort((a, b) => b.opportunity - a.opportunity),
    [],
  );

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
  }, [tags, marketPos]);

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

  return (
    <div className="newsprint min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-5 pb-24 pt-8">
        <header className="text-center">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            <Link to="/" className="hover:text-accent">
              ← Front page
            </Link>
            <span className="flex gap-4">
              <Link to="/crosswalk" className="hover:text-accent">
                The Crosswalk
              </Link>
              <Link to="/store" className="hover:text-accent">
                The Store Ledger →
              </Link>
            </span>
          </div>
          <div className="mt-4 rule-thick" />
          <h1 className="mt-5 font-display text-5xl font-black leading-none tracking-tight sm:text-6xl">
            The Web
          </h1>
          <p className="mt-3 font-display text-lg italic text-muted-foreground">
            Every demand tag wired to the app markets it would ship into
          </p>
          <div className="mt-5 border-y border-foreground py-2 font-mono text-[10px] uppercase tracking-[0.3em]">
            {tags.length} tags · {markets.length} markets · {links.length} edges
          </div>
        </header>

        <section className="mt-8 grid gap-6 border-b border-foreground pb-6 md:grid-cols-[2fr_1fr]">
          <p className="text-[16px] leading-7">
            <span className="float-left mr-2 font-display text-6xl font-black leading-[0.8]">T</span>
            he Crosswalk told us which themes attention moves ahead of. The Store Ledger told us
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
          </aside>
        </section>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setLeadingOnly(!leadingOnly)}
            className={`border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
              leadingOnly
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
          >
            Leading tags only
          </button>
          <button
            type="button"
            onClick={() => setFocus(null)}
            className="border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
          >
            Clear focus
          </button>
          {focus && (
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
              Focused: {focus}
            </span>
          )}
        </div>

        <div className="mt-6 overflow-x-auto border-y border-foreground py-4">
          <svg viewBox="-380 -380 760 760" className="mx-auto h-[640px] w-full max-w-[760px]">
            {links.map((l, i) => {
              const a = tagPos.get(l.tag)!;
              const b = marketPos.get(l.market)!;
              const active = !neighbours || (neighbours.has(l.tag) && neighbours.has(l.market));
              return (
                <path
                  key={i}
                  d={`M${a.x},${a.y} Q0,0 ${b.x},${b.y}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={active && neighbours ? 1.1 : 0.5}
                  className={active ? "text-foreground" : "text-border"}
                  opacity={active ? (neighbours ? 0.55 : 0.22) : 0.06}
                />
              );
            })}

            {markets.map((m) => {
              const p = marketPos.get(m.query)!;
              const r = 3 + (m.opportunity / 100) * 9;
              const deg = (p.a * 180) / Math.PI;
              const flip = p.x < 0;
              return (
                <g key={m.query} opacity={dim(m.query)}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={r}
                    className="cursor-pointer fill-accent"
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
                    className={leads ? "fill-foreground" : "fill-background"}
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

        {(focusTag || focusMarket) && (
          <section className="mt-6 border-b border-foreground pb-6">
            {focusTag && (
              <div>
                <h2 className="font-display text-3xl font-black capitalize">{focusTag.tag}</h2>
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
                          className="font-display text-lg font-bold capitalize hover:text-accent"
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
                <h2 className="font-display text-3xl font-black capitalize">{focusMarket.query}</h2>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  opportunity {focusMarket.opportunity} · {focusMarket.supply} listings ·{" "}
                  {Math.round(focusMarket.freshRate * 100)}% fresh · top-3 hold{" "}
                  {Math.round(focusMarket.top3Share * 100)}% ·{" "}
                  {focusMarket.demandPerFresh.toLocaleString()} ratings per new entrant
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
                        {app.ratings.toLocaleString()} ratings · released {app.released}
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
          <h2 className="font-display text-3xl font-black">The cells worth building</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-muted-foreground">
            Every edge where the tag leads attention (positive r, p ≤ 0.1) and the market still
            scores above forty on opportunity. This is the shortlist the rest of the paper exists to
            produce.
          </p>
          <div className="mt-5 border-t-2 border-foreground">
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
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                    {c.tag.tag}
                  </span>
                  <span className="font-display text-xl font-bold capitalize">
                    {c.market.query}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    lead {c.tag.lead_weeks}w · r {c.tag.r.toFixed(2)}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground md:text-right">
                    opp {c.market.opportunity} · lock {Math.round(c.market.top3Share * 100)}%
                  </span>
                </div>
              ))}
          </div>
        </section>

        <footer className="mt-12 border-t-2 border-foreground pt-5 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Joined from the Crosswalk study ({crosswalk.launchesScanned.toLocaleString()} launches)
            and the Store Ledger ({new Date(store.generatedAt).toUTCString().slice(5, 16)}) · edges
            are hand-mapped, not inferred
          </p>
        </footer>
      </div>
    </div>
  );
}
