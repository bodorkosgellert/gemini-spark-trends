import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { SiteNav } from "@/components/SiteNav";
import { useGeo } from "@/components/geo-context";
import { listArbitrage, scanArbitrage } from "@/lib/arbitrage.functions";
import type { GlobalArbitrageIdea, LocalCompetition } from "@/lib/arbitrage.types";
import { geoLabel } from "@/lib/geo.types";

export const Route = createFileRoute("/arbitrage")({
  component: ArbitragePage,
  head: () => ({
    meta: [
      { title: "Market Gaps — proven elsewhere, open here | TrendSpark" },
      {
        name: "description",
        content:
          "Compare origin markets where a SaaS category is proven against target markets where localization, rails, or compliance leave a gap for indie builders.",
      },
    ],
  }),
});

const FLAG: Record<string, string> = {
  US: "🇺🇸",
  UK: "🇬🇧",
  DE: "🇩🇪",
  JP: "🇯🇵",
  BR: "🇧🇷",
};

function competitionTone(c: LocalCompetition): string {
  if (c === "none" || c === "weak") return "text-primary";
  if (c === "fragmented") return "text-foreground";
  return "text-muted-foreground";
}

function ArbitragePage() {
  const { selection } = useGeo();
  const load = useServerFn(listArbitrage);
  const scan = useServerFn(scanArbitrage);
  const [live, setLive] = useState(false);

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ["global-arbitrage", live ? "live" : "seed"],
    queryFn: () => (live ? scan() : load()),
    staleTime: 60_000,
  });

  const onScan = () => setLive(true);

  const ideas = data?.ideas ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <div className="mx-auto max-w-6xl px-5 pb-24 pt-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
          Global comparison · regional gaps · target lens {geoLabel(selection)}
        </p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">
          Market Gaps
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Software that is standard in country A is often missing — or poorly adapted — in country
          B. This board is for vibe-coders hunting{" "}
          <strong className="font-semibold text-foreground">
            linguistic and regional openings
          </strong>
          : proven concepts, local moats (DATEV, Pix, etiquette, carriers), capitalization score.
          Complements city{" "}
          <Link to="/radar" className="underline-offset-2 hover:underline">
            Radar
          </Link>{" "}
          and{" "}
          <Link to="/discover" className="underline-offset-2 hover:underline">
            Discover
          </Link>
          .
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onScan}
            disabled={isFetching}
            className="rounded-md bg-primary px-4 py-2 font-mono text-xs uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-50"
          >
            {isFetching && live ? "Scanning desks…" : "Run live coverage scan"}
          </button>
          <button
            type="button"
            onClick={() => setLive(false)}
            disabled={isFetching}
            className="rounded-md border border-border px-4 py-2 font-mono text-xs uppercase tracking-[0.14em] hover:bg-secondary disabled:opacity-50"
          >
            Show seed board
          </button>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Focus: Europe-first (DE) · wedges JP / BR
          </span>
        </div>

        {data?.note && <p className="mt-3 text-xs text-muted-foreground">{data.note}</p>}
        {isError && (
          <p className="mt-3 text-sm text-destructive">
            {(error as Error)?.message || "Could not load the market gaps board."}
          </p>
        )}

        {/* Comparison dashboard */}
        <div className="mt-10 overflow-x-auto border-y border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <th className="py-3 pr-4 font-normal">Origin (proven)</th>
                <th className="py-3 pr-4 font-normal">Target (gap)</th>
                <th className="py-3 pr-4 font-normal">Missing component / moat</th>
                <th className="py-3 font-normal">Capitalization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ideas.map((idea) => (
                <ArbitrageRow key={idea.id} idea={idea} />
              ))}
            </tbody>
          </table>
        </div>

        <section className="mt-12 max-w-2xl">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Blueprint
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
            <li>
              <span className="text-foreground">Benchmark</span> — category dense in origin market
              (US/UK SaaS).
            </li>
            <li>
              <span className="text-foreground">Compare</span> — same job-to-be-done in DE / JP / BR
              (language, rails, tax).
            </li>
            <li>
              <span className="text-foreground">Delta</span> — high origin coverage + thin local
              modern alternatives → high capitalization score.
            </li>
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">
            Seed ideas live in <code className="font-mono">src/data/global-arbitrage.json</code>.
            Live scan refreshes coverage proxies via Tavily; App Store / Shopify locale scrape is
            the next desk.
          </p>
        </section>
      </div>
    </div>
  );
}

function ArbitrageRow({ idea }: { idea: GlobalArbitrageIdea }) {
  const o = idea.validatedMarket;
  const t = idea.targetMarketOpportunity;
  return (
    <tr className="align-top">
      <td className="py-4 pr-4">
        <div className="font-display text-base font-bold tracking-tight">
          <span className="mr-1.5" aria-hidden>
            {FLAG[o.countryCode] ?? o.countryCode}
          </span>
          {o.dominantPlayer}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{idea.coreConcept}</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {o.countryCode} · velocity {o.searchVelocity}
          {" · "}
          {idea.source}
        </p>
      </td>
      <td className="py-4 pr-4">
        <div className="font-display text-base font-bold tracking-tight">
          <span className="mr-1.5" aria-hidden>
            {FLAG[t.countryCode] ?? t.countryCode}
          </span>
          {t.countryCode}
        </div>
        <p
          className={`mt-1 font-mono text-[10px] uppercase tracking-[0.12em] ${competitionTone(t.localCompetition)}`}
        >
          competition {t.localCompetition}
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          local signal {t.localSearchVolume}
        </p>
      </td>
      <td className="py-4 pr-4">
        <p className="text-sm leading-5 text-foreground">{t.localizationMoat}</p>
        {idea.note && (
          <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{idea.note}</p>
        )}
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {idea.tags.join(" · ")}
        </p>
      </td>
      <td className="py-4">
        <span className="font-display text-2xl font-extrabold tracking-tight text-primary">
          {idea.capitalizationScore.toFixed(1)}
        </span>
        <span className="ml-1 font-mono text-[10px] uppercase text-muted-foreground">/ 10</span>
      </td>
    </tr>
  );
}
