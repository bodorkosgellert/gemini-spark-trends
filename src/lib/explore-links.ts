/** Client-safe “check it yourself” search links — same idea as the Expo explore helpers. */

export type ExploreLink = {
  id: string;
  label: string;
  hint: string;
  url: string;
  /** Host used for favicon lookup */
  host: string;
};

function q(value: string): string {
  return encodeURIComponent(value);
}

/** Google Trends explore URL (global unless a geo code is passed). */
export function trendsUrl(keyword: string, geo = "", months = 3): string {
  const range = `today ${months}-m`;
  return `https://trends.google.com/trends/explore?q=${q(keyword)}&date=${q(range)}${
    geo ? `&geo=${geo}` : ""
  }`;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Places a visitor can verify a Radar keyword for free.
 * These are search templates (keyword encoded) — not proof that a page ranked.
 */
export function exploreLinks(keyword: string): ExploreLink[] {
  const rows: Omit<ExploreLink, "host">[] = [
    {
      id: "trends",
      label: "Google Trends",
      hint: "The interest curve behind the percentage",
      url: trendsUrl(keyword),
    },
    {
      id: "search",
      label: "Google results",
      hint: "See who already ranks, and how thin it is",
      url: `https://www.google.com/search?q=${q(keyword)}`,
    },
    {
      id: "reddit",
      label: "Reddit",
      hint: "People describing the problem in their own words",
      url: `https://www.reddit.com/search/?q=${q(keyword)}&sort=new`,
    },
    {
      id: "youtube",
      label: "YouTube",
      hint: "View counts tell you if the demand converts",
      url: `https://www.youtube.com/results?search_query=${q(keyword)}`,
    },
    {
      id: "appstore",
      label: "App Store",
      hint: "Check whether the obvious app already shipped",
      url: `https://apps.apple.com/us/search?term=${q(keyword)}`,
    },
  ];
  return rows.map((r) => ({ ...r, host: hostOf(r.url) }));
}
