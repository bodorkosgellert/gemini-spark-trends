import { CheckItYourself } from "@/components/CheckItYourself";
import { SiteNav } from "@/components/SiteNav";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { getBrief } from "@/lib/briefs.functions";

export const Route = createFileRoute("/brief/$slug")({
  component: BriefPage,
  head: ({ params }) => {
    const name = params.slug.replace(/-/g, " ");
    return {
      meta: [
        { title: `Build Brief: ${name} | TrendSpark` },
        {
          name: "description",
          content: `What to build for "${name}": hero flow, who pays, a first-week plan, and the three strongest reasons it fails.`,
        },
        { property: "og:title", content: `Build Brief: ${name}` },
        {
          property: "og:description",
          content: `An evidence-backed build brief for "${name}" — hero flow, buyer, pricing, and the counter-argument.`,
        },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
});

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">{title}</h2>
      <div className="mt-2 text-[15px] leading-7">{children}</div>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ol className="list-decimal space-y-1 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ol>
  );
}

function BriefPage() {
  const { slug } = Route.useParams();
  const run = useServerFn(getBrief);
  const [copied, setCopied] = useState(false);

  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ["brief", slug],
    queryFn: () => run({ data: { slug } }),
    staleTime: Infinity,
    retry: false,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <div className="mx-auto max-w-3xl px-5 pb-24 pt-8">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          <Link to="/radar" className="hover:text-primary">
            ← The Radar
          </Link>
          <span>{data ? (data.cached ? "Filed earlier" : "Written just now") : "Brief desk"}</span>
        </div>
        

        <h1 className="mt-5 font-display text-5xl font-extrabold capitalize leading-none tracking-tight">
          {data?.brief.headline ?? slug.replace(/-/g, " ")}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Build brief for “{data?.keyword ?? slug.replace(/-/g, " ")}”
        </p>

        <div className="mt-6 max-w-md">
          <CheckItYourself keyword={data?.keyword ?? slug.replace(/-/g, " ")} />
        </div>

        {isFetching && (
          <p className="mt-10 text-base text-muted-foreground">
            The brief desk is reading the evidence…
          </p>
        )}

        {error && (
          <div className="mt-10 rounded-lg border border-border bg-secondary/40 p-5">
            <p className="text-[15px] leading-7">{(error as Error).message}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {data && !isFetching && (
          <div className="mt-8 space-y-7">
            <dl className="grid grid-cols-4 gap-2 border-y border-border py-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              {[
                ["Demand", data.demand],
                ["Supply", data.supply],
                ["Opportunity", data.opportunity],
                ["Lead", `${data.leadWeeks}w`],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt>{label}</dt>
                  <dd className="font-display text-2xl text-foreground">{value}</dd>
                </div>
              ))}
            </dl>

            <p className="font-display text-2xl leading-snug">{data.brief.one_liner}</p>

            <Block title="Hero flow — first 60 seconds">
              <List items={data.brief.hero_flow} />
            </Block>
            <Block title="Who pays">{data.brief.who_pays}</Block>
            <Block title="Pricing">{data.brief.pricing}</Block>
            <Block title="Week one">
              <List items={data.brief.first_week} />
            </Block>
            <Block title="Domain knowledge you need">
              <List items={data.brief.domain_knowledge} />
            </Block>
            <Block title="Why this dies">
              <List items={data.brief.why_this_dies} />
            </Block>
            <Block title="What would disprove it">{data.brief.disproof}</Block>

            <Block title="Paste this into your coding tool">
              <pre className="whitespace-pre-wrap border border-dotted border-border bg-muted/40 p-4 font-mono text-[12px] leading-6">
                {data.brief.build_prompt}
              </pre>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(data.brief.build_prompt);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-primary hover:underline"
              >
                {copied ? "Copied" : "Copy prompt"}
              </button>
            </Block>

            <p className="border-t border-border pt-4 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Written from live evidence · cached until the opportunity score moves 10 points · not
              investment advice
            </p>
          </div>
        )}
      </div>
    </div>
  );
}