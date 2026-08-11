import { createFileRoute, Link } from "@tanstack/react-router";
import { BlueWaves } from "@/components/BlueWaves";
import { SiteNav } from "@/components/SiteNav";
import { HEAT_LEGEND, heatStyle } from "@/lib/heat";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TrendSpark — Know what to build" },
      {
        name: "description",
        content:
          "TrendSpark reads live demand signals city by city, scores the supply gap, and hands you a build brief. Free until you earn.",
      },
      { property: "og:title", content: "TrendSpark — Know what to build" },
      {
        property: "og:description",
        content:
          "Momentum scores, regional deltas and buildable ideas from live web, code and store signals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const signals = [
  {
    kicker: "Berlin",
    title: "Neighbourhood repair cafés outpace delivery apps in weekend search",
    score: 92,
    days: 1,
    body:
      "Queries for “fix my” overtook “order my” across three postal districts. Tooling gap: nobody schedules the volunteers.",
    tags: ["local", "marketplace"],
  },
  {
    kicker: "Tokyo",
    title: "Voice-first bookkeeping requested by solo shopkeepers",
    score: 87,
    days: 4,
    body:
      "A two-week spike in forum threads asking for spoken receipts. The delta reaches Europe in roughly nine weeks.",
    tags: ["voice", "smb"],
  },
  {
    kicker: "Lisbon",
    title: "Agents buying data by the call, not by the seat",
    score: 81,
    days: 12,
    body:
      "Per-request billing chatter tripled. Seat licences read as legacy to anyone shipping an autonomous worker.",
    tags: ["agents", "pricing"],
  },
];

const ledger = [
  { label: "Signals tracked", value: "148" },
  { label: "Cities on the wire", value: "26" },
  { label: "Median lead time", value: "9 wks" },
  { label: "Our cut before you earn", value: "0%" },
];

const pipeline = [
  {
    step: "01",
    title: "Ingest",
    body: "Wikipedia pageviews, GitHub, Hacker News, App Store and live Tavily web coverage, pulled daily.",
  },
  {
    step: "02",
    title: "Score",
    body: "Demand over supply. A high score means people are asking and nobody has shipped the answer yet.",
  },
  {
    step: "03",
    title: "Brief",
    body: "One click turns a signal into a hero flow, a monetisation angle and a prompt you can paste into any builder.",
  },
];

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      <section className="relative overflow-hidden border-b border-border">
        <BlueWaves className="absolute inset-x-0 bottom-0 h-[70%] w-[130%] opacity-90" />
        <div className="relative mx-auto max-w-6xl px-5 pb-28 pt-20 sm:pt-28">
          <h1 className="font-display text-6xl font-extrabold leading-[0.92] tracking-[-0.04em] sm:text-8xl">
            TrendSpark
          </h1>
          <p className="mt-5 max-w-xl font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Building got free. Knowing what to build didn’t.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/radar"
              className="rounded-md bg-primary px-6 py-3 font-mono text-xs uppercase tracking-[0.16em] text-primary-foreground transition-opacity hover:opacity-90"
            >
              Open the radar →
            </Link>
            <Link
              to="/graph"
              className="rounded-md border border-border px-6 py-3 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              Explore the graph
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              No account · No card
            </span>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-secondary/40">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-5 py-8 sm:grid-cols-4">
          {ledger.map((item) => (
            <div key={item.label} className="px-2">
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {item.label}
              </dt>
              <dd className="mt-1 font-display text-3xl font-bold tracking-tight text-primary">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <main className="mx-auto max-w-6xl px-5 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
              Live signals
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight">
              Colour is the clock.
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              Every signal is shaded by how recently it moved. Deep blue moved today; pale blue has
              been quiet for weeks.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {HEAT_LEGEND.map((l) => (
              <div key={l.label} className="text-center">
                <div
                  className="h-6 w-12 rounded-sm border"
                  style={heatStyle(l.index)}
                />
                <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                  {l.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {signals.map((s) => (
            <article
              key={s.title}
              className="rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-[0_1px_24px_-8px_var(--heat-4)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {s.kicker}
                </span>
                <span
                  className="rounded-sm border px-2 py-0.5 font-mono text-xs font-semibold"
                  style={heatStyle(4 - Math.min(4, Math.floor(s.days / 3)))}
                >
                  {s.score} · {s.days}d
                </span>
              </div>
              <h3 className="mt-3 font-display text-lg font-bold leading-snug tracking-tight">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{s.body}</p>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
                {s.tags.join(" · ")}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {pipeline.map((p) => (
            <div key={p.step} className="rounded-lg border border-border p-5">
              <span className="font-mono text-xs text-primary">{p.step}</span>
              <h3 className="mt-2 font-display text-xl font-bold tracking-tight">{p.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-lg border border-border bg-secondary/50 p-8">
          <h2 className="font-display text-2xl font-bold tracking-tight">Free until you earn.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Listing and briefs cost nothing. We take a share only after a build has made its first
            thousand, and the split is printed on the page.
          </p>
          <Link
            to="/store"
            className="mt-5 inline-block rounded-md bg-primary px-5 py-2.5 font-mono text-xs uppercase tracking-[0.16em] text-primary-foreground"
          >
            See the store ledger
          </Link>
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <span>TrendSpark · Berlin</span>
          <span>Free until you earn</span>
        </div>
      </footer>
    </div>
  );
}
