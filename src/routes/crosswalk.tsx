import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import data from "@/data/tag-crosswalk.json";

export const Route = createFileRoute("/crosswalk")({
  component: Crosswalk,
  head: () => ({
    meta: [
      { title: "The Crosswalk — do signals precede launches? | TrendSpark" },
      {
        name: "description",
        content:
          "A two-month backfill of 1,500 real app launches from Hacker News and GitHub, matched week by week against demand signals, with r, p and lead time per tag.",
      },
      { property: "og:title", content: "The Crosswalk — do signals precede launches?" },
      {
        property: "og:description",
        content:
          "1,500 launches, 712 tagged, nine weeks. Correlation and lead time between demand tags and the apps that shipped after them.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Row = (typeof data.rows)[number];

function Bars({ values, className }: { values: number[]; className?: string }) {
  // Scale between the observed min and max so week-to-week variation is visible
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  return (
    <div className={`flex h-8 items-end gap-[2px] ${className ?? ""}`}>
      {values.map((v, i) => (
        <span
          key={i}
          className="flex-1 bg-current"
          style={{ height: `${8 + ((v - min) / span) * 92}%` }}
        />
      ))}
    </div>
  );
}

function verdict(row: Row) {
  if (row.p <= 0.05 && row.r > 0) return { label: "Significant lead", tone: "text-primary" };
  if (row.p <= 0.15 && row.r > 0) return { label: "Suggestive", tone: "text-foreground" };
  if (row.r < -0.5) return { label: "Runs opposite", tone: "text-muted-foreground" };
  return { label: "Noise", tone: "text-muted-foreground" };
}

function Crosswalk() {
  const [sort, setSort] = useState<"launches" | "r" | "p">("launches");
  const [onlySignificant, setOnlySignificant] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    const list = (data.rows as Row[]).filter((r) => (onlySignificant ? r.p <= 0.15 && r.r > 0 : true));
    return [...list].sort((a, b) =>
      sort === "launches" ? b.app_launches - a.app_launches : sort === "r" ? b.r - a.r : a.p - b.p,
    );
  }, [sort, onlySignificant]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-5 pb-24 pt-8">
        <header className="text-center">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            <Link to="/" className="hover:text-primary">
              ← Front page
            </Link>
            <span className="flex gap-4">
              <Link to="/store" className="hover:text-primary">
                The Store Ledger
              </Link>
              <Link to="/graph" className="hover:text-primary">
                The Web
              </Link>
              <Link to="/radar" className="hover:text-primary">
                The Radar →
              </Link>
            </span>
          </div>
          <div className="mt-4 rule-thick" />
          <h1 className="mt-5 font-display text-5xl font-extrabold leading-none tracking-tight sm:text-6xl">
            The Crosswalk
          </h1>
          <p className="mt-3 font-display text-lg italic text-muted-foreground">
            Two months of real launches, read backwards into the signals that came before them
          </p>
          <div className="mt-5 border-y border-border py-2 font-mono text-[10px] uppercase tracking-[0.3em]">
            {data.launchesScanned.toLocaleString()} launches scanned · {data.launchesTagged} tagged ·{" "}
            {data.weeks.length} weeks · {data.windowStart} → {data.windowEnd}
          </div>
        </header>

        <section className="mt-8 grid gap-6 border-b border-border pb-6 md:grid-cols-[2fr_1fr]">
          <p className="text-[16px] leading-7">
            <span className="float-left mr-2 font-display text-6xl font-extrabold leading-[0.8]">W</span>
            e pulled every Show HN post and every GitHub repository above fifteen stars created in the
            last sixty days, tagged each one from its title, description and topics, then lined the
            weekly launch counts up against the weekly attention behind our own demand tags. For each
            tag we take the lag between zero and three weeks that maximises correlation, and report
            Pearson <em>r</em>, the two-sided <em>p</em>, and how many weeks the signal ran ahead. This
            is the reverse direction: instead of asking what a signal predicts, we ask what the things
            people actually shipped were preceded by.
          </p>
          <aside className="border-l border-dotted border-border pl-5 font-mono text-[11px] leading-6 text-muted-foreground">
            <p className="mb-2 uppercase tracking-[0.25em] text-foreground">Caveats</p>
            <p>Nine weekly points per tag. Anything with p above 0.05 is a hint, not a finding.</p>
            <p className="mt-2">Tags are keyword-matched, so a launch can carry several.</p>
            <p className="mt-2">Show HN and GitHub over-represent developer tools and under-represent local services.</p>
          </aside>
        </section>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Sort
          </span>
          {(["launches", "r", "p"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              className={`border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
                sort === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              {s === "launches" ? "Volume" : s === "r" ? "Correlation" : "Significance"}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOnlySignificant((v) => !v)}
            className={`border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors ${
              onlySignificant
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
          >
            Leading tags only
          </button>
        </div>

        <div className="mt-6 border-t border-border">
          {rows.map((row) => {
            const v = verdict(row);
            const isOpen = open === row.tag;
            return (
              <article key={row.tag} className="border-b border-border py-4">
                <div className="grid grid-cols-2 items-center gap-4 md:grid-cols-[1.3fr_repeat(4,0.6fr)_1fr]">
                  <h2 className="font-display text-2xl font-bold capitalize leading-tight">
                    {row.tag}
                  </h2>
                  <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    Launches
                    <div className="font-display text-lg text-foreground">{row.app_launches}</div>
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    r
                    <div className="font-display text-lg text-foreground">{row.r.toFixed(2)}</div>
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    p
                    <div className="font-display text-lg text-foreground">{row.p.toFixed(3)}</div>
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    Lead
                    <div className="font-display text-lg text-foreground">{row.lead_weeks}w</div>
                  </div>
                  <div
                    className={`font-mono text-[10px] uppercase tracking-[0.2em] ${v.tone} md:text-right`}
                  >
                    {v.label}
                  </div>
                </div>

                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Signal attention
                    </p>
                    <Bars values={row.sigWeek} className="mt-1 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Launches shipped
                    </p>
                    <Bars values={row.appWeek} className="mt-1 text-primary" />
                  </div>
                </div>

                {row.examples.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : row.tag)}
                    className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-primary hover:underline"
                  >
                    {isOpen ? "Hide launches" : `Matched launches (${row.examples.length})`}
                  </button>
                )}
                {isOpen && (
                  <ul className="mt-3 space-y-2 border-t border-dotted border-border pt-3">
                    {row.examples.map((ex, i) => (
                      <li key={i} className="text-[13px] leading-5">
                        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                          {ex.src} · {ex.score} pts · {ex.at.slice(0, 10)}
                        </span>
                        <br />
                        {ex.url ? (
                          <a
                            href={ex.url}
                            target="_blank"
                            rel="noreferrer"
                            className="underline decoration-dotted"
                          >
                            {ex.title}
                          </a>
                        ) : (
                          <span>{ex.title}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>

        <footer className="mt-12 border-t border-border pt-5 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Backfill compiled {new Date(data.generatedAt).toUTCString().slice(5, 16)} · sources: Hacker
            News Algolia, GitHub Search, Wikimedia Pageviews
          </p>
        </footer>
      </div>
    </div>
  );
}