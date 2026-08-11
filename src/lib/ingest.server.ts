/**
 * TrendSpark ingest engine — server only.
 *
 * Pulls each keyword through four independent public sources, then folds the
 * readings into a demand score, a supply score and an opportunity score.
 * Every source is optional: a failing source degrades the score's confidence
 * rather than the whole run.
 */

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
  try {
    const cookieRes = await fetch(`https://trends.google.com/?geo=${geo}`, {
      headers: { "user-agent": UA },
    });
    const cookie = (cookieRes.headers.get("set-cookie") ?? "").split(";")[0] ?? "";

    const req = {
      comparisonItem: [{ keyword, geo, time: "today 12-m" }],
      category: 0,
      property: "",
    };
    const exploreUrl =
      `https://trends.google.com/trends/api/explore?hl=en-US&tz=0&geo=${geo}&req=` +
      encodeURIComponent(JSON.stringify(req));
    const exploreRaw = await fetch(exploreUrl, {
      headers: { "user-agent": UA, cookie },
    }).then((r) => r.text());
    const widgets = JSON.parse(exploreRaw.slice(5)).widgets as Array<any>;
    const timeseries = widgets.find((w) => w.id === "TIMESERIES");
    if (!timeseries) throw new Error("no timeseries widget");

    const dataUrl =
      `https://trends.google.com/trends/api/widgetdata/multiline?hl=en-US&tz=0&token=${timeseries.token}&req=` +
      encodeURIComponent(JSON.stringify(timeseries.request));
    const dataRaw = await fetch(dataUrl, { headers: { "user-agent": UA, cookie } }).then((r) =>
      r.text(),
    );
    const points = JSON.parse(dataRaw.slice(5)).default.timelineData as Array<any>;
    const series = points.map((p) => Number(p.value?.[0] ?? 0));

    readings.push({
      source: "Google Trends",
      metric: "interest_last_12m",
      value: series.at(-1) ?? 0,
      detail: `${series.length} weekly points, geo ${geo}`,
      url: `https://trends.google.com/trends/explore?geo=${geo}&q=${encodeURIComponent(keyword)}`,
    });
    return { series, readings };
  } catch (error) {
    readings.push({
      source: "Google Trends",
      metric: "interest_last_12m",
      value: null,
      detail: `unavailable: ${(error as Error).message}`,
      url: `https://trends.google.com/trends/explore?geo=${geo}&q=${encodeURIComponent(keyword)}`,
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
        url: null,
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
          url: null,
        },
      ],
    };
  }
}

/* ------------------------------------------------------------------ */
/* Source 4 — Reddit (community formation)                             */
/* ------------------------------------------------------------------ */

export async function reddit(keyword: string): Promise<Reading[]> {
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
        url: `https://www.reddit.com/search/?q=${encodeURIComponent(keyword)}&sort=new`,
      },
    ];
  } catch (error) {
    return [
      {
        source: "Reddit",
        metric: "posts_30d",
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


function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
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
}): { demand: number; supply: number; opportunity: number; momentum: number; lead: number } {
  const { series, hnRecent, redditPosts, githubRepos } = input;

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

  // Supply: how crowded the build side already is.
  const supply = Math.round(Math.min(Math.log1p(githubRepos ?? 0) / Math.log(3000), 1) * 100);

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
  geo = "US",
): Promise<KeywordResult> {
  // Sequential with small gaps: the free tiers of these APIs rate-limit hard
  // when a batch fans out in parallel.
  const trends = await googleTrends(keyword, geo);
  const wiki = await wikipediaDemand(keyword);
  await sleep(300);
  const gh = await githubSupply(keyword);
  await sleep(300);
  const hn = await hackerNews(keyword);
  const rd = await reddit(keyword);

  const githubRepos = gh[0]?.value ?? null;
  const redditPosts = rd[0]?.value ?? null;
  const series = trends.series.length >= 8 ? trends.series : wiki.series;
  const scored = score({
    series,
    hnRecent: hn.recent,
    redditPosts,
    githubRepos,
  });

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
    why: explain({ ...scored, lead: scored.lead, firstSeenAt: hn.firstSeenAt }),
    series,
    readings: [...trends.readings, ...wiki.readings, ...gh, ...hn.readings, ...rd],
  };
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}