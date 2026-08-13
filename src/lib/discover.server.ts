/**
 * Cold-start discovery desks → ranked watchlist-ready keywords.
 * Deterministic only — no LLM. Titles are evidence, not keyword soup.
 */
import type { DiscoverCandidate } from "@/lib/discover.types";
import { WATCHLIST } from "@/lib/watchlist";
import { listPromotedWatchlist } from "@/lib/watchlist.server";

export type { DiscoverCandidate };

type Desk = {
  id: string;
  /** Tavily / search query (can be boolean-ish). */
  query: string;
  /** Watchlist-ready keyword if the desk is alive. */
  seedKeyword: string;
  category: string;
  tags: string[];
};

/** Anchor desks → canonical keywords (same shape as Radar watchlist). */
const TAVILY_DESKS: Desk[] = [
  {
    id: "tavily-climate-local",
    query: "Balkonkraftwerk App OR monitoring Tool Deutschland",
    seedKeyword: "balcony solar app",
    category: "energy",
    tags: ["local", "climate", "hardware"],
  },
  {
    id: "tavily-handwerk",
    query: "Handwerker Disposition Software OR Field Service Tool Deutschland",
    seedKeyword: "handwerker scheduling software",
    category: "smb",
    tags: ["smb", "services", "local"],
  },
  {
    id: "tavily-kleinunternehmer",
    query: "Kleinunternehmer Rechnung App OR E-Rechnung Tool",
    seedKeyword: "kleinunternehmer invoicing",
    category: "smb",
    tags: ["smb", "finance", "compliance"],
  },
  {
    id: "tavily-berlin",
    query: "Berlin Nachbarschaft App OR local services marketplace Germany",
    seedKeyword: "berlin neighbourhood services app",
    category: "local",
    tags: ["local", "community", "city"],
  },
  {
    id: "tavily-agents-smb",
    query: "AI receptionist OR voice agent small business Germany",
    seedKeyword: "ai receptionist germany",
    category: "ai-tools",
    tags: ["agents", "smb", "voice"],
  },
  {
    id: "tavily-repair",
    query: "Reparaturcafé Terminbuchung App OR repair cafe booking",
    seedKeyword: "repair cafe booking",
    category: "local",
    tags: ["local", "community", "climate"],
  },
  {
    id: "tavily-dpp",
    query: "Digital Product Passport software SME Europe",
    seedKeyword: "digital product passport sme",
    category: "regulation",
    tags: ["compliance", "eu", "supply-chain"],
  },
  {
    id: "tavily-heatpump",
    query: "Wärmepumpe Installateur Software OR heat pump installer CRM Germany",
    seedKeyword: "heat pump installer crm",
    category: "energy",
    tags: ["local", "services", "climate"],
  },
];

const BIG_PLAYERS =
  /\b(salesforce|hubspot|sap\b|microsoft|oracle|servicenow|zendesk|jobber|servicetitan)\b/i;

/** Headline / wire junk — never promote these as keywords. */
const NEWS_JUNK =
  /\b(breaking|exclusive|opinion|says|said|announce[sd]?|launches?|raises?|funding|ipo|ceo|interview|report[sd]?|according|week in|daily|newsletter|podcast|dies?|killed|war|election|stock|shares?|billion|million round)\b/i;

const STOP =
  /^(the|and|for|with|from|this|that|what|how|why|who|best|top|new|free|vs|oder|und|für|eine|einer|der|die|das|a|an|to|of|in|on|is|are|my|our|your)$/i;

/** Only keep phrases that look like something you'd type into Trends / a watchlist. */
const PRODUCT_SHAPE =
  /\b(app|apps|tool|tools|software|saas|platform|crm|booking|scheduler|invoicing|invoice|agent|agents|automation|marketplace|dashboard|api|mcp|plugin|extension|crm|erp)\b/i;

function isUsableKeyword(phrase: string): boolean {
  if (phrase.length < 6 || phrase.length > 42) return false;
  if (NEWS_JUNK.test(phrase)) return false;
  if (/^\d/.test(phrase)) return false;
  const words = phrase.split(/\s+/);
  if (words.length < 2 || words.length > 5) return false;
  if (words.every((w) => STOP.test(w))) return false;
  // Prefer product-shaped; allow DE niche stems we care about
  const niche =
    /\b(balcony|solar|handwerker|kleinunternehmer|repair|cafe|heat.?pump|invoic|e-?rechnung|neighbourhood|neighborhood|receptionist|passport|booking|scheduling)\b/i;
  return PRODUCT_SHAPE.test(phrase) || niche.test(phrase);
}

function normPhrase(raw: string): string | null {
  let s = raw
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9äöüß\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  s = s
    .replace(/\bbalkonkraftwerk\b/g, "balcony solar")
    .replace(/\breparaturcafé\b|\breparaturcafe\b|\brepair café\b/g, "repair cafe")
    .replace(/\bwärmepumpe\b/g, "heat pump")
    .replace(/\be-?rechnung\b/g, "e invoicing");
  const words = s.split(" ").filter((w) => w.length > 1 && !STOP.test(w));
  if (words.length < 2 || words.length > 5) return null;
  s = words.join(" ");
  if (!isUsableKeyword(s)) return null;
  return s;
}

/**
 * Pull at most a few tool-shaped phrases from a title.
 * Prefer "… app/tool for X" / Ask HN asks — skip generic n-grams.
 */
function phrasesFromTitle(title: string): string[] {
  if (NEWS_JUNK.test(title)) return [];
  const base = title
    .replace(/\s*[\|–—]\s*[^|–—]{0,40}$/u, "")
    .replace(/^(ask hn|show hn|tell hn)\s*:\s*/i, "")
    .trim();

  const out = new Set<string>();

  const patterns = [
    /(?:app|tool|software|saas|platform)\s+for\s+([a-z0-9äöüß\s-]{4,36})/i,
    /(?:looking for|need|recommend)\s+(?:an?\s+)?([a-z0-9äöüß\s-]{4,36}?)\s+(?:app|tool|software)/i,
    /(?:alternative to)\s+([a-z0-9äöüß\s-]{3,28})/i,
    /^([a-z0-9äöüß\s-]{4,36}?)\s+(?:app|tool|software|saas|crm)\b/i,
  ];

  for (const re of patterns) {
    const m = base.match(re);
    if (!m?.[1]) continue;
    const phrase = normPhrase(`${m[1]} app`) ?? normPhrase(m[1]);
    if (phrase) out.add(phrase);
  }

  // Whole title only if already product-shaped and short
  const whole = normPhrase(base);
  if (whole && PRODUCT_SHAPE.test(whole)) out.add(whole);

  return [...out];
}

async function tavilySearch(query: string): Promise<Array<{ title: string; url: string }>> {
  const key = process.env["TAVILY_API_KEY"];
  if (!key) return [];
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      query,
      // general > news: fewer wire headlines, more product pages
      topic: "general",
      max_results: 8,
      search_depth: "basic",
      include_answer: false,
    }),
  });
  if (!res.ok) throw new Error(`Tavily ${res.status}`);
  const data = (await res.json()) as {
    results?: Array<{ title?: string; url?: string }>;
  };
  return (data.results ?? [])
    .filter((r) => r.title && r.url)
    .map((r) => ({ title: r.title!, url: r.url! }));
}

async function hnDesk(): Promise<Array<{ title: string; url: string }>> {
  const url =
    "https://hn.algolia.com/api/v1/search_by_date?tags=ask_hn&hitsPerPage=30&query=%22app%20for%22%20OR%20%22tool%20for%22%20OR%20automate%20OR%20alternative";
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    hits?: Array<{ title?: string; url?: string; objectID?: string }>;
  };
  return (data.hits ?? [])
    .filter((h) => h.title && !NEWS_JUNK.test(h.title))
    .map((h) => ({
      title: h.title!,
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
    }));
}

type Acc = {
  keyword: string;
  category: string;
  tags: string[];
  desk: string;
  hits: number;
  bigHits: number;
  deskSeed: boolean;
  topTitle: string | null;
  topUrl: string | null;
};

export async function discoverCandidates(): Promise<{
  candidates: DiscoverCandidate[];
  desksRun: string[];
  generatedAt: string;
  note: string;
}> {
  const known = new Set(
    [...WATCHLIST, ...(await listPromotedWatchlist())].map((w) =>
      w.keyword.trim().toLowerCase(),
    ),
  );

  const acc = new Map<string, Acc>();
  const desksRun: string[] = [];
  let tavilyOk = false;

  const bump = (
    phrase: string,
    desk: { id: string; category: string; tags: string[] },
    hit: { title: string; url: string },
    opts?: { deskSeed?: boolean },
  ) => {
    const usable = normPhrase(phrase) ?? (isUsableKeyword(phrase) ? phrase.toLowerCase() : null);
    if (!usable) return;
    const key = usable;
    const prev = acc.get(key);
    const isBig = BIG_PLAYERS.test(hit.title);
    if (!prev) {
      acc.set(key, {
        keyword: usable,
        category: desk.category,
        tags: desk.tags,
        desk: desk.id,
        hits: 1,
        bigHits: isBig ? 1 : 0,
        deskSeed: Boolean(opts?.deskSeed),
        topTitle: hit.title,
        topUrl: hit.url,
      });
    } else {
      prev.hits += 1;
      if (isBig) prev.bigHits += 1;
      if (opts?.deskSeed) prev.deskSeed = true;
      if (!prev.topTitle) {
        prev.topTitle = hit.title;
        prev.topUrl = hit.url;
      }
    }
  };

  for (const desk of TAVILY_DESKS) {
    try {
      const results = await tavilySearch(desk.query);
      desksRun.push(desk.id);
      if (results.length) tavilyOk = true;

      // Primary candidate = canonical seed (not scraped headline)
      if (results.length >= 1) {
        const evidence = results.find((r) => !NEWS_JUNK.test(r.title)) ?? results[0]!;
        bump(desk.seedKeyword, desk, evidence, { deskSeed: true });
        // Extra weight: more product-like hits on the desk
        for (const hit of results.slice(0, 3)) {
          if (!NEWS_JUNK.test(hit.title) && PRODUCT_SHAPE.test(hit.title)) {
            bump(desk.seedKeyword, desk, hit, { deskSeed: true });
          }
        }
      }

      // Secondary: only tightly extracted tool phrases from titles
      for (const hit of results) {
        if (NEWS_JUNK.test(hit.title)) continue;
        for (const phrase of phrasesFromTitle(hit.title)) {
          bump(phrase, desk, hit);
        }
      }
    } catch {
      desksRun.push(`${desk.id}:error`);
    }
  }

  try {
    const hn = await hnDesk();
    desksRun.push("hn-ask");
    const hnMeta = { id: "hn-ask", category: "developer", tags: ["developer", "agents"] };
    for (const hit of hn) {
      for (const phrase of phrasesFromTitle(hit.title)) {
        bump(phrase, hnMeta, hit);
      }
    }
  } catch {
    desksRun.push("hn-ask:error");
  }

  const candidates: DiscoverCandidate[] = [...acc.values()]
    .map((row) => {
      const onWatchlist = known.has(row.keyword);
      const thinBonus = row.bigHits === 0 ? 14 : row.bigHits === 1 ? 4 : -20;
      const seedBonus = row.deskSeed ? 28 : 0;
      const score = row.hits * 10 + thinBonus + seedBonus + (onWatchlist ? -50 : 0);
      const reason = row.deskSeed
        ? "Desk seed — watchlist-shaped niche with live coverage (title is evidence only)"
        : row.bigHits > 1
          ? "Incumbents in evidence — weak indie wedge"
          : "Extracted tool/app phrase from Ask HN or product titles";
      return {
        keyword: row.keyword,
        category: row.category,
        tags: row.tags,
        score,
        desk: row.desk,
        evidenceCount: row.hits,
        topTitle: row.topTitle,
        topUrl: row.topUrl,
        onWatchlist,
        reason,
      };
    })
    .filter((c) => c.score > 0 && !c.onWatchlist && isUsableKeyword(c.keyword))
    .sort((a, b) => b.score - a.score)
    .slice(0, 16);

  return {
    candidates,
    desksRun,
    generatedAt: new Date().toISOString(),
    note: tavilyOk
      ? "Keywords are desk seeds + tool-shaped extracts. News headlines are evidence links only — not the keyword."
      : "Tavily empty/missing — HN tool-shaped Ask posts only (if any).",
  };
}
