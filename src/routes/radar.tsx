import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { listSignals, type EvidenceRow, type SignalRow } from "@/lib/signals.functions";
import { ALL_TAGS } from "@/lib/watchlist";

export const Route = createFileRoute("/radar")({
  loader: () => listSignals(),
  component: Radar,
  errorComponent: () => (
    <div className="newsprint min-h-screen bg-background p-10 text-center font-display text-2xl">
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

function Sparkline({ series }: { series: number[] }) {
  if (series.length < 4) return null;
  const max = Math.max(...series, 1);
  const points = series
    .map((v, i) => `${(i / (series.length - 1)) * 100},${28 - (v / max) * 26}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-8 w-full">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function Radar() {
  const { signals, evidence, lastRun } = Route.useLoaderData();
  const [query, setQuery] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [detail, setDetail] = useState<"compact" | "standard" | "full">("standard");

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
      return matchesQuery && matchesTags;
    });
  }, [signals, query, tags]);

  const toggleTag = (tag: string) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  return (
    <div className="newsprint min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-5 pb-24 pt-8">
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
            <span>
              {lastRun?.finished_at
                ? `Filed ${new Date(lastRun.finished_at).toUTCString().slice(5, 22)} UTC`
                : "Awaiting first run"}
            </span>
          </div>
          <div className="mt-4 rule-thick" />
          <h1 className="mt-5 font-display text-5xl font-black leading-none tracking-tight sm:text-7xl">
            The Radar
          </h1>
          <p className="mt-3 font-display text-lg italic text-muted-foreground">
            Demand scored against the supply already shipped
          </p>
          <div className="mt-5 border-y border-foreground py-2 font-mono text-[10px] uppercase tracking-[0.3em]">
            Wikipedia attention · GitHub supply · Hacker News t₀ · Google Trends
          </div>
        </header>

        <section className="mt-8 border-b border-foreground pb-6">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Search the wire
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="voice, compliance, agents…"
              className="mt-2 w-full border-b-2 border-foreground bg-transparent pb-2 font-display text-2xl outline-none placeholder:text-muted-foreground/60"
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
                  className={`border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
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
                  className={`border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
                    detail === level
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </section>

        {signals.length === 0 ? (
          <p className="mt-12 text-center font-display text-xl italic text-muted-foreground">
            The wire is empty. Run the ingest hook to file the first edition.
          </p>
        ) : (
          <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((s: SignalRow) => {
              const rows = evidenceBySignal.get(s.id) ?? [];
              const isOpen = detail === "full" ? open !== `closed-${s.id}` : open === s.id;
              return (
                <article key={s.id} className="border-t-2 border-foreground pt-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
                      {s.category}
                    </span>
                    <span className="font-display text-3xl font-bold leading-none">
                      {s.opportunity_score}
                    </span>
                  </div>
                  <h2 className="mt-2 font-display text-2xl font-bold capitalize leading-tight">
                    {s.keyword}
                  </h2>
                  {detail !== "compact" && (
                    <div className="mt-3 text-muted-foreground">
                      <Sparkline series={s.series ?? []} />
                    </div>
                  )}
                  <dl className="mt-3 grid grid-cols-3 gap-2 border-y border-dotted border-border py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    <div>
                      <dt>Demand</dt>
                      <dd className="font-display text-lg text-foreground">{s.demand_score}</dd>
                    </div>
                    <div>
                      <dt>Supply</dt>
                      <dd className="font-display text-lg text-foreground">{s.supply_score}</dd>
                    </div>
                    <div>
                      <dt>Lead</dt>
                      <dd className="font-display text-lg text-foreground">{s.lead_weeks}w</dd>
                    </div>
                  </dl>
                  {detail !== "compact" && <p className="mt-3 text-[15px] leading-7">{s.why}</p>}
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {s.tags.join(" · ")}
                  </p>
                  <Link
                    to="/brief/$slug"
                    params={{ slug: s.slug }}
                    className="mt-3 inline-block border border-foreground px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-foreground hover:text-background"
                  >
                    Build brief →
                  </Link>
                  {detail !== "compact" && (
                    <button
                      type="button"
                      onClick={() =>
                        detail === "full"
                          ? setOpen(isOpen ? `closed-${s.id}` : null)
                          : setOpen(isOpen ? null : s.id)
                      }
                      className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-accent hover:underline"
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
          <p className="mt-12 text-center font-display text-xl italic text-muted-foreground">
            Nothing on the wire matches that. Try fewer tags.
          </p>
        )}

        <footer className="mt-16 border-t-2 border-foreground pt-5 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Opportunity = demand discounted by the tooling already shipped. Not investment advice.
          </p>
        </footer>
      </div>
    </div>
  );
}