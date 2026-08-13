/**
 * TrendSpark ingest engine — server only.
 *
 * Pulls each keyword through four independent public sources, then folds the
 * readings into a demand score, a supply score and an opportunity score.
 * Every source is optional: a failing source degrades the score's confidence
 * rather than the whole run.
 */
import type { GeoContext } from "./geo.types";
import { parseTrendsPayload } from "./evidence-display";

export type Reading = {
  source: string;
  metric: string;
  value: number | null;
  detail: string;
  url: string | null;
};

export type KeywordResult = {
  keyword: string;
  category: string;
  tags: string[];
  demand: number;
  supply: number;
  opportunity: number;
  momentum: number;
  leadWeeks: number;
  firstSeenAt: string | null;
  why: string;
  series: number[];
  readings: Reading[];
  geo: GeoContext;
  sourceScopes: Record<string, "city" | "country" | "global">;
  /** Worldwide Google Trends series when the pull succeeded. Empty if not measured. */
  globalSeries: number[];
  globalScores: {
    demand: number;
    supply: number;
    opportunity: number;
    momentum: number;
    lead: number;
  } | null;
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fetch JSON, retrying rate-limited responses with backoff. */
async function jsonFetch(url: string, init?: RequestInit, attempt = 0): Promise<any> {
  const res = await fetch(url, {
    ...init,
    headers: { "user-agent": UA, accept: "application/json", ...(init?.headers ?? {}) },
  });
  if ((res.status === 429 || res.status === 403) && attempt < 3) {
    await sleep(2000 * (attempt + 1));
    return jsonFetch(url, init, attempt + 1);
  }
  if (!res.ok) throw new Error(`${res.status} ${url.slice(0, 80)}`);
  return res.json();
}

const WIKI_UA = "TrendSpark/1.0 (demand radar; https://trendspark.lovable.app)";

/* ------------------------------------------------------------------ */
/* Source 1 — Google Trends (demand / crowding)                        */
/* ------------------------------------------------------------------ */

export async function googleTrends(
  keyword: string,
  geo: string,
): Promise<{ series: number[]; readings: Reading[] }> {
  const readings: Reading[] = [];
  const geoCode = geo.trim().toUpperCase();
  const exploreGeo = geoCode || "";
  try {
    const cookieRes = await fetch(
      geoCode ? `https://trends.google.com/?geo=${geoCode}` : "https://trends.google.com/",
      { headers: { "user-agent": UA } },
    );
    const cookie = (cookieRes.headers.get("set-cookie") ?? "").split(";")[0] ?? "";

    const req = {
      comparisonItem: [{ keyword, geo: exploreGeo, time: "today 12-m" }],
      category: 0,
      property: "",
    };
    const exploreUrl =
      `https://trends.google.com/trends/api/explore?hl=en-US&tz=0` +
      (exploreGeo ? `&geo=${exploreGeo}` : "") +
      `&req=` +
      encodeURIComponent(JSON.stringify(req));
    const exploreRaw = await fetch(exploreUrl, {
      headers: { "user-agent": UA, cookie },
    }).then((r) => r.text());
    const widgets = (parseTrendsPayload(exploreRaw) as { widgets?: Array<any> }).widgets ?? [];
    const timeseries = widgets.find((w) => w.id === "TIMESERIES");
    if (!timeseries) throw new Error("no timeseries widget");

    const dataUrl =
      `https://trends.google.com/trends/api/widgetdata/multiline?hl=en-US&tz=0&token=${timeseries.token}&req=` +
      encodeURIComponent(JSON.stringify(timeseries.request));
    const dataRaw = await fetch(dataUrl, { headers: { "user-agent": UA, cookie } }).then((r) =>
      r.text(),
    );
    const points = (
      parseTrendsPayload(dataRaw) as { default?: { timelineData?: Array<any> } }
    ).default?.timelineData ?? [];
    const series = points.map((p) => Number(p.value?.[0] ?? 0));

    const exploreLink = exploreGeo
      ? `https://trends.google.com/trends/explore?geo=${exploreGeo}&q=${encodeURIComponent(keyword)}`
      : `https://trends.google.com/trends/explore?q=${encodeURIComponent(keyword)}`;
    readings.push({
      source: "Google Trends",
      metric: exploreGeo ? "interest_last_12m" : "interest_global_12m",
      value: series.at(-1) ?? 0,
      detail: `${series.length} weekly points, geo ${exploreGeo || "worldwide"}`,
      url: exploreLink,
    });
    return { series, readings };
  } catch (error) {
    const exploreLink = exploreGeo
      ? `https://trends.google.com/trends/explore?geo=${exploreGeo}&q=${encodeURIComponent(keyword)}`
      : `https://trends.google.com/trends/explore?q=${encodeURIComponent(keyword)}`;
    readings.push({
      source: "Google Trends",
      metric: exploreGeo ? "interest_last_12m" : "interest_global_12m",
      value: null,
      detail: `unavailable: ${(error as Error).message}`,
      url: exploreLink,
    });
    return { series: [], readings };
  }
}

/* ------------------------------------------------------------------ */
/* Source 1b — Wikipedia pageviews (demand fallback, always reachable) */
/* ------------------------------------------------------------------ */

/** Weekly pageview series for the article that best matches the keyword. */
export async function wikipediaDemand(
  keyword: string,
): Promise<{ series: number[]; readings: Reading[] }> {
  try {
    const search = await jsonFetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        keyword,
      )}&srlimit=1&format=json&origin=*`,
      { headers: { "user-agent": WIKI_UA } },
    );
    const title = search?.query?.search?.[0]?.title as string | undefined;
    if (!title) throw new Error("no article match");

    const end = new Date();
    const start = new Date(end.getTime() - 364 * 864e5);
    const stamp = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "") + "00";
    const data = await jsonFetch(
      `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(
        title.replace(/ /g, "_"),
      )}/daily/${stamp(start)}/${stamp(end)}`,
      { headers: { "user-agent": WIKI_UA } },
    );
    const daily = (data.items ?? []).map((i: any) => Number(i.views ?? 0)) as number[];

    const series: number[] = [];
    for (let i = 0; i + 7 <= daily.length; i += 7) {
      series.push(Math.round(daily.slice(i, i + 7).reduce((a, b) => a + b, 0) / 7));
    }
    const peak = Math.max(...series, 1);
    const normalised = series.map((v) => Math.round((v / peak) * 100));

    return {
      series: normalised,
      readings: [
        {
          source: "Wikipedia",
          metric: "weekly_pageviews",
          value: series.at(-1) ?? 0,
          detail: `"${title}" — ${series.length} weeks of reader attention, indexed to its own peak`,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
        },
      ],
    };
  } catch (error) {
    return {
      series: [],
      readings: [
        {
          source: "Wikipedia",
          metric: "weekly_pageviews",
          value: null,
          detail: `unavailable: ${(error as Error).message}`,
          url: null,
        },
      ],
    };
  }
}

/* ------------------------------------------------------------------ */
/* Source 2 — GitHub (supply: how much tooling already exists)         */
/* ------------------------------------------------------------------ */

export async function githubSupply(keyword: string): Promise<Reading[]> {
  const since = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
  const q = `${keyword} in:name,description created:>${since}`;
  try {
    const data = await jsonFetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&per_page=1`,
      { headers: { accept: "application/vnd.github+json" } },
    );
    return [
      {
        source: "GitHub",
        metric: "new_repos_90d",
        value: Number(data.total_count ?? 0),
        detail: `repos created since ${since} matching "${keyword}"`,
        url: `https://github.com/search?q=${encodeURIComponent(q)}&type=repositories`,
      },
    ];
  } catch (error) {
    return [
      {
        source: "GitHub",
        metric: "new_repos_90d",
        value: null,
        detail: `unavailable: ${(error as Error).message}`,
        url: `https://github.com/search?q=${encodeURIComponent(keyword)}&type=repositories`,
      },
    ];
  }
}

/* ------------------------------------------------------------------ */
/* Source 3 — Hacker News (t0 / first public mention + recent chatter) */
/* ------------------------------------------------------------------ */

export async function hackerNews(keyword: string): Promise<{
  firstSeenAt: string | null;
  recent: number;
  readings: Reading[];
}> {
  const query = encodeURIComponent(keyword);
  try {
    const oldest = await jsonFetch(
      `https://hn.algolia.com/api/v1/search_by_date?query=${query}&tags=(story,comment)&hitsPerPage=1&numericFilters=created_at_i>0`,
    );
    const total = Number(oldest.nbHits ?? 0);
    let firstSeenAt: string | null = null;
    if (total > 0) {
      const lastPage = Math.min(Math.ceil(total / 1) - 1, 999);
      const tail = await jsonFetch(
        `https://hn.algolia.com/api/v1/search_by_date?query=${query}&tags=(story,comment)&hitsPerPage=1&page=${lastPage}`,
      );
      firstSeenAt = tail.hits?.[0]?.created_at ?? null;
    }

    const cutoff = Math.floor((Date.now() - 30 * 864e5) / 1000);
    const recentData = await jsonFetch(
      `https://hn.algolia.com/api/v1/search?query=${query}&tags=story&numericFilters=created_at_i>${cutoff}&hitsPerPage=1`,
    );
    const recent = Number(recentData.nbHits ?? 0);

    return {
      firstSeenAt,
      recent,
      readings: [
        {
          source: "Hacker News",
          metric: "first_mention",
          value: null,
          detail: firstSeenAt ? `first indexed mention ${firstSeenAt.slice(0, 10)}` : "no trace",
          url: `https://hn.algolia.com/?query=${query}&sort=byDate`,
        },
        {
          source: "Hacker News",
          metric: "stories_30d",
          value: recent,
          detail: `${recent} front-page-eligible stories in the last 30 days`,
          url: `https://hn.algolia.com/?query=${query}`,
        },
      ],
    };
  } catch (error) {
    return {
      firstSeenAt: null,
      recent: 0,
      readings: [
        {
          source: "Hacker News",
          metric: "stories_30d",
          value: null,
          detail: `unavailable: ${(error as Error).message}`,
          url: `https://hn.algolia.com/?query=${query}`,
        },
      ],
    };
  }
}

/* ------------------------------------------------------------------ */
/* Source 4 — Reddit (community formation)                             */
/* ------------------------------------------------------------------ */

export async function reddit(keyword: string): Promise<Reading[]> {
  const publicUrl = `https://www.reddit.com/search/?q=${encodeURIComponent(keyword)}&sort=new`;
  try {
    const url = `https://old.reddit.com/search.json?q=${encodeURIComponent(
      keyword,
    )}&sort=new&t=month&limit=100`;
    const data = await jsonFetch(url);
    const children = (data?.data?.children ?? []) as Array<any>;
    const score = children.reduce((sum, c) => sum + Number(c.data?.score ?? 0), 0);
    return [
      {
        source: "Reddit",
        metric: "posts_30d",
        value: children.length,
        detail: `${children.length} posts, ${score} combined upvotes in the last month`,
        url: publicUrl,
      },
    ];
  } catch {
    const viaTavily = await redditViaTavily(keyword);
    if (viaTavily) return viaTavily;
    return [
      {
        source: "Reddit",
        metric: "posts_30d",
        value: null,
        detail: "unavailable: Reddit blocked automated counts",
        url: publicUrl,
      },
    ];
  }
}

async function redditViaTavily(keyword: string): Promise<Reading[] | null> {
  const key = process.env["TAVILY_API_KEY"];
  if (!key) return null;
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        query: keyword,
        include_domains: ["reddit.com"],
        topic: "general",
        days: 30,
        max_results: 10,
        search_depth: "basic",
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: Array<{ title?: string; url?: string }>;
    };
    const results = data.results ?? [];
    if (results.length === 0) return null;
    const top = results[0];
    return [
      {
        source: "Reddit",
        metric: "posts_30d",
        value: results.length,
        detail: top?.title
          ? `${results.length} Reddit threads via Tavily — top: "${top.title}"`
          : `${results.length} Reddit threads via Tavily in the last 30 days`,
        url: top?.url ?? `https://www.reddit.com/search/?q=${encodeURIComponent(keyword)}&sort=new`,
      },
    ];
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Source 5 — Tavily (live web: is anyone writing about this now?)     */
/* ------------------------------------------------------------------ */

/**
 * One Tavily search per keyword — the cheapest useful call. Returns how much
 * fresh web coverage the topic has and the single most relevant source, which
 * the Build Brief later uses as its "why now" citation.
 */
export async function tavilyCoverage(keyword: string): Promise<Reading[]> {
  const key = process.env["TAVILY_API_KEY"];
  if (!key) {
    return [
      {
        source: "Tavily",
        metric: "web_articles_30d",
        value: null,
        detail: "no API key configured",
        url: null,
      },
    ];
  }
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        query: keyword,
        topic: "news",
        days: 30,
        max_results: 10,
        search_depth: "basic",
      }),
    });
    if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 120)}`);
    const data = (await res.json()) as {
      results?: Array<{ title?: string; url?: string; score?: number }>;
    };
    const results = data.results ?? [];
    const top = results[0];
    return [
      {
        source: "Tavily",
        metric: "web_articles_30d",
        value: results.length,
        detail: top?.title
          ? `${results.length} fresh articles — top: "${top.title}"`
          : `${results.length} fresh articles in the last 30 days`,
        url: top?.url ?? null,
      },
    ];
  } catch (error) {
    return [
      {
        source: "Tavily",
        metric: "web_articles_30d",
        value: null,
        detail: `unavailable: ${(error as Error).message}`,
        url: null,
      },
    ];
  }
}

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Source 6 — DataForSEO (absolute Google search volume)               */
/* ------------------------------------------------------------------ */

export type DfsResult = {
  readings: Reading[];
  /** 12 monthly search-volume points, oldest → newest. */
  series: number[];
  volume: number | null;
};

/**
 * Google Ads search volume via DataForSEO. Gives absolute monthly searches and
 * a 12-month history, which is stronger demand evidence than page views.
 * Location code 2276 = Germany, 2840 = United States.
 */
export async function dataForSeoVolume(
  keyword: string,
  locationCode = 2840,
  languageCode = "en",
): Promise<DfsResult> {
  const auth = process.env["DATAFORSEO_AUTH"];
  const empty = (detail: string): DfsResult => ({
    readings: [
      { source: "DataForSEO", metric: "monthly_searches", value: null, detail, url: null },
    ],
    series: [],
    volume: null,
  });
  if (!auth) return empty("no API key configured");
  const cached = dfsCache.get(dfsKey(keyword, locationCode));
  if (cached) return cached;
  try {
    const res = await fetch(
      "https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live",
      {
        method: "POST",
        headers: { authorization: `Basic ${auth}`, "content-type": "application/json" },
        body: JSON.stringify([
          { keywords: [keyword], location_code: locationCode, language_code: languageCode },
        ]),
      },
    );
    const data = (await res.json()) as any;
    if (data?.status_code !== 20000) {
      return empty(`unavailable: ${data?.status_message ?? res.status}`);
    }
    const item = data?.tasks?.[0]?.result?.[0];
    if (!item) return empty("no data for this keyword");
    const months: Array<{ search_volume?: number }> = item.monthly_searches ?? [];
    const series = months
      .slice()
      .reverse()
      .map((m) => Number(m.search_volume ?? 0));
    const volume: number | null =
      typeof item.search_volume === "number" ? item.search_volume : null;
    const competition = item.competition ? String(item.competition).toLowerCase() : null;
    return {
      readings: [
        {
          source: "DataForSEO",
          metric: "monthly_searches",
          value: volume,
          detail:
            volume === null
              ? "no volume reported"
              : `${volume.toLocaleString("en-US")} Google searches/mo${
                  competition ? ` — ad competition ${competition}` : ""
                }`,
          url: null,
        },
      ],
      series,
      volume,
    };
  } catch (error) {
    return empty(`unavailable: ${(error as Error).message}`);
  }
}

function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}

/* ------------------------------------------------------------------ */
/* DataForSEO batch cache                                              */
/* ------------------------------------------------------------------ */

const dfsCache = new Map<string, DfsResult>();

function dfsKey(keyword: string, locationCode: number): string {
  return `${locationCode}:${keyword.toLowerCase()}`;
}

function dfsResultFromItem(item: any): DfsResult {
  const months: Array<{ search_volume?: number }> = item?.monthly_searches ?? [];
  const series = months
    .slice()
    .reverse()
    .map((m) => Number(m.search_volume ?? 0));
  const volume: number | null = typeof item?.search_volume === "number" ? item.search_volume : null;
  const competition = item?.competition ? String(item.competition).toLowerCase() : null;
  return {
    readings: [
      {
        source: "DataForSEO",
        metric: "monthly_searches",
        value: volume,
        detail:
          volume === null
            ? "no volume reported"
            : `${volume.toLocaleString("en-US")} Google searches/mo${
                competition ? ` — ad competition ${competition}` : ""
              }`,
        url: null,
      },
    ],
    series,
    volume,
  };
}

/**
 * One paid task for the whole watchlist instead of one per keyword.
 * DataForSEO bills per task, so batching cuts the run cost by ~20x.
 */
export async function prefetchDataForSeo(
  keywords: string[],
  locationCode = 2840,
  languageCode = "en",
): Promise<{ fetched: number; cost: number; error: string | null }> {
  const auth = process.env["DATAFORSEO_AUTH"];
  if (!auth || keywords.length === 0) return { fetched: 0, cost: 0, error: "no API key" };
  try {
    const res = await fetch(
      "https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live",
      {
        method: "POST",
        headers: { authorization: `Basic ${auth}`, "content-type": "application/json" },
        body: JSON.stringify([
          {
            keywords: keywords.slice(0, 700).map((k) => k.toLowerCase()),
            location_code: locationCode,
            language_code: languageCode,
          },
        ]),
      },
    );
    const data = (await res.json()) as any;
    if (data?.status_code !== 20000) {
      return { fetched: 0, cost: 0, error: data?.status_message ?? `http ${res.status}` };
    }
    const items: any[] = data?.tasks?.[0]?.result ?? [];
    for (const item of items) {
      if (!item?.keyword) continue;
      dfsCache.set(dfsKey(String(item.keyword), locationCode), dfsResultFromItem(item));
    }
    return { fetched: items.length, cost: Number(data?.cost ?? 0), error: null };
  } catch (error) {
    return { fetched: 0, cost: 0, error: (error as Error).message };
  }
}

/** Consecutive trailing weeks above the trailing-year baseline. */
function leadWeeks(series: number[]): number {
  if (series.length < 8) return 0;
  const baseline = mean(series.slice(0, Math.floor(series.length / 2)));
  if (baseline <= 0) return 0;
  let count = 0;
  for (let i = series.length - 1; i >= 0; i -= 1) {
    const point = series[i];
    if (point === undefined || point < baseline * 1.15) break;
    count += 1;
  }
  return count;
}

export function score(input: {
  series: number[];
  hnRecent: number;
  redditPosts: number | null;
  githubRepos: number | null;
  /** App Store hits from iTunes Search — commercial shelf occupancy. */
  itunesApps?: number | null;
  /** 0..1 from `shelfSatisfaction()`; null when the store returned no rating data. */
  storeSatisfaction?: number | null;
}): { demand: number; supply: number; opportunity: number; momentum: number; lead: number } {
  const { series, hnRecent, redditPosts, githubRepos, itunesApps, storeSatisfaction } = input;

  const recent = mean(series.slice(-4));
  const base = mean(series.slice(0, Math.max(series.length - 4, 1)));
  const momentum = base > 0 ? Math.round(((recent - base) / base) * 100) : 0;
  const lead = leadWeeks(series);

  // Demand: momentum, sustained lead, and live conversation volume.
  const demand = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        clampScale(momentum, -50, 200) * 45 +
          Math.min(lead / 8, 1) * 30 +
          Math.min(Math.log1p(hnRecent + (redditPosts ?? 0)) / Math.log(120), 1) * 25,
      ),
    ),
  );

  // Supply: max of developer crowding (GitHub) and commercial shelf (App Store).
  // Physical/admin niches often have ~0 repos but many App Store results — GitHub alone
  // used to understate supply and inflate opportunity.
  const ghSupply = Math.min(Math.log1p(githubRepos ?? 0) / Math.log(3000), 1) * 100;
  const storeOccupancy = Math.min(Math.log1p(itunesApps ?? 0) / Math.log(80), 1) * 100;

  // A crowded shelf only counts as *served* demand if the shelf is any good. Discount
  // occupancy by satisfaction so "many badly-rated apps" stays an opportunity instead of
  // reading as saturation. Floor at 0.5: bad incumbents still occupy attention, so the
  // discount is a haircut, never an erasure. Null satisfaction = no data, so no discount.
  const storeSupply =
    storeSatisfaction == null ? storeOccupancy : storeOccupancy * (0.5 + 0.5 * storeSatisfaction);

  const supply = Math.round(Math.max(ghSupply, storeSupply));

  // Opportunity: demand that nobody has served yet.
  const opportunity = Math.max(0, Math.round(demand * (1 - supply / 130)));

  return { demand, supply, opportunity, momentum, lead };
}

function clampScale(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

export function explain(input: {
  demand: number;
  supply: number;
  momentum: number;
  lead: number;
  firstSeenAt: string | null;
  /** 0..1 from `shelfSatisfaction()` — lets the narrative separate "crowded" from "well served". */
  storeSatisfaction?: number | null;
}): string {
  const parts: string[] = [];
  parts.push(
    input.momentum >= 0
      ? `Search interest is ${input.momentum}% above its own trailing baseline.`
      : `Search interest is ${Math.abs(input.momentum)}% below its trailing baseline.`,
  );
  parts.push(
    input.lead >= 4
      ? `The rise has held for ${input.lead} straight weeks, which is the pattern that precedes crowding.`
      : `The rise is only ${input.lead} weeks old, so it is not yet distinguishable from noise.`,
  );
  parts.push(
    input.supply < 30
      ? "Almost nothing has shipped against it yet."
      : input.supply < 60
        ? "Tooling is appearing but the field is not settled."
        : "The build side is already crowded; differentiation costs more than the idea.",
  );
  // A shelf can be full and still leave the job undone — that is the better target, so say so.
  if (input.storeSatisfaction != null && input.storeSatisfaction < 0.5 && input.supply >= 30) {
    parts.push(
      "The apps that exist are rated poorly or barely used, so the demand is not actually served.",
    );
  }
  if (input.firstSeenAt) {
    parts.push(`First public mention: ${input.firstSeenAt.slice(0, 10)}.`);
  }
  return parts.join(" ");
}

/* ------------------------------------------------------------------ */
/* Orchestration                                                       */
/* ------------------------------------------------------------------ */

export async function collectKeyword(
  keyword: string,
  category: string,
  tags: string[],
  geo: GeoContext,
): Promise<KeywordResult> {
  // Sequential with small gaps: the free tiers of these APIs rate-limit hard
  // when a batch fans out in parallel.
  const trends = await googleTrends(keyword, geo.countryCode);
  await sleep(300);
  const trendsGlobal = await googleTrends(keyword, "");
  const wiki = await wikipediaDemand(keyword);
  await sleep(300);
  const gh = await githubSupply(keyword);
  await sleep(300);
  const hn = await hackerNews(keyword);
  const rd = await reddit(keyword);
  const tv = await tavilyCoverage(keyword);
  const dfs = await dataForSeoVolume(keyword, geo.locationCode ?? 2840, geo.languageCode);
  const { itunesSearchApps, shelfSatisfaction } = await import("./itunes.server");
  const itunesCountry = geo.countryCode.toLowerCase();
  const itunes = await itunesSearchApps(keyword, itunesCountry, 25);
  const shelf = shelfSatisfaction(itunes.apps);
  const topApps = itunes.apps
    .slice(0, 3)
    .map((a) => a.trackName)
    .join("; ");
  const itunesReading = {
    source: "App Store (iTunes Search)",
    metric: "software_results",
    value: itunes.count,
    detail: topApps || `no software hits for "${keyword}" (${itunesCountry})`,
    url: itunes.url,
  };
  // Separate reading so the discount on supply is auditable rather than baked into one number.
  const shelfReading = shelf
    ? {
        source: "App Store ratings",
        metric: "shelf_satisfaction",
        value: Math.round(shelf.score * 100),
        detail:
          `${shelf.weightedStars.toFixed(1)}★ weighted across ${shelf.ratedApps} rated app(s), ` +
          `${shelf.totalRatings.toLocaleString("en-US")} ratings` +
          (shelf.score < 0.5 ? " — crowded but poorly served" : ""),
        url: itunes.url,
      }
    : null;

  const githubRepos = gh[0]?.value ?? null;
  const redditPosts = rd[0]?.value ?? null;
  const webArticles = tv[0]?.value ?? null;
  const series =
    dfs.series.length >= 8 ? dfs.series : trends.series.length >= 8 ? trends.series : wiki.series;
  const scored = score({
    series,
    hnRecent: hn.recent,
    redditPosts: redditPosts === null ? webArticles : redditPosts + (webArticles ?? 0),
    githubRepos,
    itunesApps: itunes.count,
    storeSatisfaction: shelf?.score ?? null,
  });
  const conversation = redditPosts === null ? webArticles : redditPosts + (webArticles ?? 0);
  const globalScored =
    trendsGlobal.series.length >= 8
      ? score({
          series: trendsGlobal.series,
          hnRecent: hn.recent,
          redditPosts: conversation,
          githubRepos,
          itunesApps: null,
          storeSatisfaction: null,
        })
      : null;

  return {
    keyword,
    category,
    tags,
    demand: scored.demand,
    supply: scored.supply,
    opportunity: scored.opportunity,
    momentum: scored.momentum,
    leadWeeks: scored.lead,
    firstSeenAt: hn.firstSeenAt,
    why: explain({
      ...scored,
      lead: scored.lead,
      firstSeenAt: hn.firstSeenAt,
      storeSatisfaction: shelf?.score ?? null,
    }),
    series,
    globalSeries: trendsGlobal.series,
    globalScores: globalScored,
    readings: [
      ...dfs.readings,
      ...trends.readings,
      ...trendsGlobal.readings,
      ...wiki.readings,
      ...gh,
      itunesReading,
      ...(shelfReading ? [shelfReading] : []),
      ...hn.readings,
      ...rd,
      ...tv,
    ],
    geo,
    sourceScopes: {
      DataForSEO: geo.measurementScope === "city-measured" ? "city" : "country",
      "Google Trends": "country",
      "App Store": "country",
      Wikipedia: "global",
      GitHub: "global",
      "Hacker News": "global",
      Reddit: "global",
      Tavily: "global",
    },
  };
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
