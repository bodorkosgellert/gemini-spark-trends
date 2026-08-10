import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TrendSpark — The Daily Signal Broadsheet" },
      {
        name: "description",
        content:
          "TrendSpark reads the world's trend signals city by city and prints the ones worth building. Browse the catalog, pay what you earn.",
      },
      { property: "og:title", content: "TrendSpark — The Daily Signal Broadsheet" },
      {
        property: "og:description",
        content:
          "A newspaper for emerging demand: momentum scores, regional deltas, and buildable ideas. Free until you earn.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const dateline = "Vol. I · No. 001 · Berlin · Monday, 10 August 2026 · Free until you earn";

const signals = [
  {
    kicker: "Berlin",
    title: "Neighbourhood repair cafés outpace delivery apps in weekend search",
    score: 92,
    body:
      "Queries for “fix my” overtook “order my” across three postal districts. Tooling gap: nobody schedules the volunteers.",
    tags: ["local", "marketplace"],
  },
  {
    kicker: "Tokyo",
    title: "Voice-first bookkeeping requested by solo shopkeepers",
    score: 87,
    body:
      "A two-week spike in forum threads asking for spoken receipts. The delta reaches Europe in roughly nine weeks.",
    tags: ["voice", "smb"],
  },
  {
    kicker: "Lisbon",
    title: "Agents buying data by the call, not by the seat",
    score: 81,
    body:
      "Per-request billing chatter tripled. Seat licences read as legacy to anyone shipping an autonomous worker.",
    tags: ["agents", "pricing"],
  },
];

const ledger = [
  { label: "Signals filed today", value: "148" },
  { label: "Cities on the wire", value: "26" },
  { label: "Median lead time", value: "9 wks" },
  { label: "Our cut, before you earn", value: "0%" },
];

function Index() {
  return (
    <div className="newsprint min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-5 pb-24 pt-8">
        <header className="text-center">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            <span>Est. 2026</span>
            <span>Edition Européenne</span>
            <span>Price: what you think it is</span>
          </div>
          <div className="mt-4 rule-thick" />
          <h1 className="mt-5 font-display text-6xl font-black leading-none tracking-tight sm:text-8xl">
            The TrendSpark
          </h1>
          <p className="mt-3 font-display text-lg italic text-muted-foreground">
            “All the demand that’s fit to build”
          </p>
          <div className="mt-5 border-y border-foreground py-2 font-mono text-[10px] uppercase tracking-[0.3em]">
            {dateline}
          </div>
        </header>

        <main className="mt-10 grid gap-10 lg:grid-cols-[1.15fr_2fr_1fr]">
          <aside className="order-2 space-y-6 lg:order-1 lg:border-r lg:border-border lg:pr-8">
            <h2 className="border-b-2 border-foreground pb-1 font-display text-xl font-bold">
              The Ledger
            </h2>
            <dl className="space-y-4">
              {ledger.map((item) => (
                <div key={item.label} className="border-b border-dotted border-border pb-3">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd className="font-display text-3xl font-bold">{item.value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We take a share only after a listing has earned its first thousand. Until then the
              press runs at our expense.
            </p>
          </aside>

          <section className="order-1 lg:order-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
              Lead story
            </p>
            <h2 className="mt-2 font-display text-4xl font-black leading-[1.05] sm:text-5xl">
              A newspaper for demand that hasn’t been built yet.
            </h2>
            <p className="mt-4 border-l-2 border-accent pl-4 font-display text-lg italic leading-snug">
              Every morning TrendSpark reads the noise of forums, marketplaces and street-level
              search, then prints the handful of signals that a small team could still act on.
            </p>
            <div className="mt-6 columns-1 gap-8 text-[15px] leading-7 sm:columns-2 [&>p]:mb-4">
              <p>
                <span className="float-left mr-2 mt-1 font-display text-6xl font-black leading-[0.72]">
                  T
                </span>
                he trouble with trend data is that it arrives as a chart and leaves as a shrug.
                TrendSpark files it as journalism instead: a kicker, a place, a number, and a plain
                sentence about the gap nobody has filled.
              </p>
              <p>
                Each signal carries a momentum score and a regional delta — how many weeks before
                Tokyo’s habit becomes Berlin’s. Builders publish what they make back into the
                catalog, and readers can see the whole chain from observation to shipped product.
              </p>
              <p>
                Pricing follows the same plain logic. Listing is free. When a build earns, we take a
                modest share, and the split is printed on the page rather than buried in a contract.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-foreground pt-5">
              <Link
                to="/radar"
                className="bg-foreground px-6 py-3 font-mono text-xs uppercase tracking-[0.2em] text-background transition-colors hover:bg-accent"
              >
                Open the radar
              </Link>
              <a
                href="#signals"
                className="border border-foreground px-6 py-3 font-mono text-xs uppercase tracking-[0.2em] transition-colors hover:bg-foreground hover:text-background"
              >
                Read today’s edition
              </a>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                No account · No card
              </span>
            </div>
          </section>

          <aside className="order-3 space-y-5 lg:border-l lg:border-border lg:pl-8">
            <h2 className="border-b-2 border-foreground pb-1 font-display text-xl font-bold">
              Classifieds
            </h2>
            {[
              "WANTED — one builder for a voice bookkeeping ledger. Signal no. 087.",
              "FOR SALE — dormant domain, repaircafe.city. Enquire within.",
              "NOTICE — agent lane opens Friday. Per-call billing, no seats.",
              "SOUGHT — Lisbon correspondent to file weekly pricing signals.",
            ].map((line) => (
              <p
                key={line}
                className="border-b border-dotted border-border pb-4 font-mono text-[11px] uppercase leading-5 tracking-wide text-muted-foreground"
              >
                {line}
              </p>
            ))}
          </aside>
        </main>

        <section id="signals" className="mt-14">
          <div className="rule-thick" />
          <h2 className="mt-5 text-center font-display text-3xl font-black uppercase tracking-tight">
            Signals of the Day
          </h2>
          <div className="mt-6 grid gap-8 border-t border-foreground pt-8 md:grid-cols-3">
            {signals.map((s, i) => (
              <article
                key={s.title}
                className={
                  i > 0 ? "md:border-l md:border-border md:pl-8" : undefined
                }
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">
                    {s.kicker}
                  </span>
                  <span className="font-display text-2xl font-bold">{s.score}</span>
                </div>
                <h3 className="mt-2 font-display text-2xl font-bold leading-tight">{s.title}</h3>
                <p className="mt-3 text-[15px] leading-7 text-muted-foreground">{s.body}</p>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {s.tags.join(" · ")}
                </p>
              </article>
            ))}
          </div>
        </section>

        <footer className="mt-16 border-t-2 border-foreground pt-5 text-center">
          <p className="font-display text-xl font-bold">The TrendSpark</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Printed in Berlin · Set in Playfair &amp; Source Serif · Free until you earn
          </p>
        </footer>
      </div>
    </div>
  );
}
