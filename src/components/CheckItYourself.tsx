import { useState } from "react";

import { exploreLinks, type ExploreLink } from "@/lib/explore-links";

function Favicon({ link }: { link: ExploreLink }) {
  const [stage, setStage] = useState<"ddg" | "google" | "letter">("ddg");
  const letter = link.label.replace(/^r\//, "").charAt(0).toUpperCase();

  if (stage === "letter" || !link.host) {
    return (
      <span
        aria-hidden
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-border bg-background font-mono text-[11px] font-semibold text-muted-foreground"
      >
        {letter}
      </span>
    );
  }

  const src =
    stage === "google"
      ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(link.host)}&sz=64`
      : `https://icons.duckduckgo.com/ip3/${link.host}.ico`;

  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border bg-background">
      <img
        src={src}
        alt=""
        width={16}
        height={16}
        className="h-4 w-4"
        onError={() => setStage((s) => (s === "ddg" ? "google" : "letter"))}
      />
    </span>
  );
}

/** Five search links so visitors can verify a keyword without trusting the card alone. */
export function CheckItYourself({
  keyword,
  geo = "",
}: {
  keyword: string;
  geo?: string;
}) {
  const links = exploreLinks(keyword, geo);

  return (
    <div className="mt-3 border-t border-dotted border-border pt-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
        Check it yourself
      </p>
      <ul className="mt-2 divide-y divide-border/80">
        {links.map((link) => (
          <li key={link.id}>
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 py-2.5 transition-colors hover:bg-muted/40"
            >
              <Favicon link={link} />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium leading-tight text-foreground">
                  {link.label}
                </span>
                <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">
                  {link.hint}
                </span>
              </span>
              <span
                aria-hidden
                className="shrink-0 font-mono text-[12px] text-muted-foreground"
              >
                ↗
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
