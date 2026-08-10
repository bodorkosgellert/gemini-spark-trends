import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import data from "@/data/appstore-signals.json";

export const Route = createFileRoute("/store")({
  component: StoreLedger,
  head: () => ({
    meta: [
      { title: "The Store Ledger — App Store openings and crowding | TrendSpark" },
      {
        name: "description",
        content:
          "Live App Store data across six European storefronts: how much supply each category carries, how fresh it is, how concentrated the ratings are, and which openings are still enterable.",
      },
      { property: "og:title", content: "The Store Ledger — App Store openings and crowding" },
      {
        property: "og:description",
        content:
          "Twenty-five categories, six storefronts, thousands of apps. Demand per fresh entrant, incumbent lock, and the release-year histogram behind each category.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Row = (typeof data.rows)[number];

const COUNTRY_NAMES: Record<string, string> = {
  de: "Germany",
  fr: "France",
  gb: "United Kingdom",
  es: "Spain",
  it: "Italy",
  nl: "Netherlands",
};

function verdict(row: Row) {
  if (row.top3Share >= 0.8) return { label: "Locked by incumbents", tone: "text-muted-foreground" };
  if (row.freshRate >= 0.4) return { label: "Being rebuilt now", tone: "text-accent" };
  if (row.freshRate <= 0.12 && row.ratingsTotal > 500_000)
    return { label: "Stale but proven", tone: "text-accent" };
  return { label: "Contested", tone: "text-foreground" };
}

function YearBars({ hist }: { hist: Record<string, number> }) {
  const years = Object.keys(hist)
    .map(Number)
    .filter((y) => y >= 2012)
    .sort((a, b) => a - b);
  const max = Math.max(...years.map((y) => hist[String(y)] ?? 0), 1);
  return (
    <div className="flex h-8 items-end gap-[2px]">
      {years.map((y) => (
        <span
          key={y}
          title={`${y}: ${hist[String(y)]} apps`}
          className="flex-1 bg-current"
          style={{ height: `${8 + ((hist[String(y)] ?? 0) / max) * 92}%` }}
        />
      ))}
    </div>
  );
}

function StoreLedger() {
  const [sort, setSort] = useState<"opportunity" | "supply" | "fresh" | "lock">("opportunity");
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    return [...(data.rows as Row[])].sort((a, b) =>
      sort === "opportunity"
        ? b.opportunity - a.opportunity
        : sort === "supply"
          ? b.supply - a.supply
          : sort === "fresh"
            ? b.freshRate - a.freshRate
            : a.top3Share - b.top3Share,
    );
  }, [sort]);

  const totalApps = (data.rows as Row[]).reduce((s, r) => s + r.supply, 0);

  return (
    <div className="newsprint min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-5 pb-24 pt-8">
        <header className="text-center">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            <Link to="/" className="hover:text-accent">
              ← Front page
            </Link>
            <Link to="/crosswalk" className="hover:text-accent">
              The Crosswalk →
            </Link>
          </div>
          <div className="mt-4 rule-thick" />
          <h1 className="mt-5 font-display text-5xl font-black leading-none tracking-tight sm:text-6xl">
            The Store Ledger
          </h1>
          <p className="mt-3 font-display text-lg italic text-muted-foreground">
            What the App Store already sells, who owns it, and where the shelf is still empty
          </p>
          <div className="mt-5 border-y border-foreground py-2 font-mono text-[10px] uppercase tracking-[0.3em]">
            {data.rows.length} categories · {totalApps.toLocaleString()} listings ·{" "}
            {data.countries.length} storefronts
          </div>
        </header>

        <section className="mt-8 grid gap-6 border-b border-foreground pb-6 md:grid-cols-[2fr_1fr]">
          <p className="text-[16px] leading-7">
            <span className="float-left mr-2 font-display text-6xl font-black leading-[0.8]">T</span>
            he Radar measures whether people are paying attention. This ledger measures whether anyone
            has already built the thing. For every category we query six European storefronts, collect
            every listing Apple returns, and read four numbers off them: total supply, the share of
            that supply released in the last twelve months, the total rating count behind the whole
            shelf, and how much of that rating count the top three apps hold. A category with heavy
            ratings, little fresh supply and a loose grip at the top is an opening. A category where
            three apps hold ninety per cent is a wall.
          </p>
          <aside className="border-l border-dotted border-border pl-5 font-mono text-[11px] leading-6 text-muted-foreground">
            <p className="mb-2 uppercase tracking-[0.25em] text-foreground">Reading the columns</p>
            <p>
              <span className="text-foreground">Supply</span> — distinct listings matched across the
              six storefronts.
            </p>
            <p className="mt-2">
              <span className="text-foreground">Fresh</span> — share first released in the last year.
            </p>
            <p className="mt-2">
              <span className="text-foreground">Lock</span> — ratings held by the top three apps.
            </p>
            <p className="mt-2">
              <span className="text-foreground">Per entrant</span> — ratings on the shelf divided by
              new entrants: how much validated demand each newcomer is walking into.
            </p>
          </aside>
        </section>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Sort
          </span>
          {(
            [
              ["opportunity", "Opportunity"],
              ["supply", "Supply"],
              ["fresh", "Freshness"],
              ["lock", "Least locked"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              className={`border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
                sort === key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6 border-t-2 border-foreground">
          {rows.map((row) => {
            const v = verdict(row);
            const isOpen = open === row.query;
            return (
              <article key={row.query} className="border-b border-border py-4">
                <div className="grid grid-cols-2 items-center gap-4 md:grid-cols-[1.4fr_repeat(4,0.6fr)_1fr]">
                  <h2 className="font-display text-2xl font-bold capitalize leading-tight">
                    {row.query}
                    <span className="ml-2 font-mono text-[11px] font-normal text-accent">
                      {row.opportunity}
                    </span>
                  </h2>
                  <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    Supply
                    <div className="font-display text-lg text-foreground">{row.supply}</div>
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    Fresh
                    <div className="font-display text-lg text-foreground">
                      {Math.round(row.freshRate * 100)}%
                    </div>
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    Lock
                    <div className="font-display text-lg text-foreground">
                      {Math.round(row.top3Share * 100)}%
                    </div>
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    Per entrant
                    <div className="font-display text-lg text-foreground">
                      {row.demandPerFresh.toLocaleString()}
                    </div>
                  </div>
                  <div
                    className={`font-mono text-[10px] uppercase tracking-[0.2em] ${v.tone} md:text-right`}
                  >
                    {v.label}
                  </div>
                </div>

                <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_1.2fr]">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Releases by year
                    </p>
                    <div className="mt-1 text-muted-foreground">
                      <YearBars hist={row.yearHist as Record<string, number>} />
                    </div>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Listings per storefront
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
                      {Object.entries(row.perCountry as Record<string, number>).map(([c, n]) => (
                        <span key={c}>
                          <span className="uppercase text-muted-foreground">{c}</span> {n}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : row.query)}
                  className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-accent hover:underline"
                >
                  {isOpen ? "Hide incumbents" : `Who holds the shelf (${row.top.length})`}
                </button>
                {isOpen && (
                  <ul className="mt-3 space-y-2 border-t border-dotted border-border pt-3">
                    {row.top.map((app, i) => (
                      <li key={i} className="text-[13px] leading-5">
                        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                          {app.genre} · {app.ratings.toLocaleString()} ratings ·{" "}
                          {app.rating ? `${app.rating.toFixed(1)}★ · ` : ""}released{" "}
                          {app.released} · updated {app.updated} · {app.price || "—"}
                        </span>
                        <br />
                        {app.url ? (
                          <a
                            href={app.url}
                            target="_blank"
                            rel="noreferrer"
                            className="underline decoration-dotted"
                          >
                            {app.name}
                          </a>
                        ) : (
                          <span>{app.name}</span>
                        )}
                        <span className="text-muted-foreground"> — {app.seller}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>

        <section className="mt-12 border-t-2 border-foreground pt-6">
          <h2 className="font-display text-3xl font-black">Today at the top of the charts</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-muted-foreground">
            The fifty free apps currently ranking highest in each storefront, reduced to their
            category mix. Where a country's mix differs from its neighbours, local demand is doing
            something the others are not.
          </p>
          <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.charts.map((c) => (
              <div key={c.country} className="border-t border-foreground pt-3">
                <h3 className="font-display text-xl font-bold">
                  {COUNTRY_NAMES[c.country] ?? c.country.toUpperCase()}
                </h3>
                <ul className="mt-2 font-mono text-[11px] leading-6 text-muted-foreground">
                  {Object.entries(c.genres as Record<string, number>)
                    .slice(0, 5)
                    .map(([g, n]) => (
                      <li key={g} className="flex justify-between gap-3">
                        <span className="truncate">{g}</span>
                        <span className="text-foreground">{n}</span>
                      </li>
                    ))}
                </ul>
                <ol className="mt-3 space-y-1 text-[13px] leading-5">
                  {c.top.slice(0, 5).map((t, i) => (
                    <li key={i}>
                      <span className="font-mono text-[10px] text-muted-foreground">{i + 1}. </span>
                      {t.name}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-12 border-t-2 border-foreground pt-5 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Ledger compiled {new Date(data.generatedAt).toUTCString().slice(5, 16)} · sources: Apple
            iTunes Search API, Apple App Store charts feed
          </p>
        </footer>
      </div>
    </div>
  );
}