/**
 * Official iTunes Search API — public, no key.
 * https://performance-partners.apple.com/search-api
 * Use for commercial app supply (not GitHub-only niches).
 */
export type ItunesAppHit = {
  trackId: number;
  trackName: string;
  sellerName: string;
  primaryGenreName: string;
  /** `| undefined` is explicit because tsconfig sets exactOptionalPropertyTypes. */
  averageUserRating?: number | undefined;
  userRatingCount?: number | undefined;
};

export async function itunesSearchApps(
  term: string,
  country = "us",
  limit = 25,
): Promise<{ count: number; apps: ItunesAppHit[]; url: string }> {
  const url =
    `https://itunes.apple.com/search?term=${encodeURIComponent(term)}` +
    `&country=${country}&entity=software&limit=${limit}`;
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json", "user-agent": "TrendSpark/1.0" },
    });
    if (!res.ok) return { count: 0, apps: [], url };
    const json = (await res.json()) as {
      resultCount?: number;
      results?: Array<Record<string, unknown>>;
    };
    const apps: ItunesAppHit[] = (json.results ?? [])
      .filter((r) => r["wrapperType"] === "software" || r["kind"] === "software")
      .map((r) => ({
        trackId: Number(r["trackId"] ?? 0),
        trackName: String(r["trackName"] ?? ""),
        sellerName: String(r["sellerName"] ?? r["artistName"] ?? ""),
        primaryGenreName: String(r["primaryGenreName"] ?? ""),
        averageUserRating:
          typeof r["averageUserRating"] === "number" ? r["averageUserRating"] : undefined,
        userRatingCount:
          typeof r["userRatingCount"] === "number" ? r["userRatingCount"] : undefined,
      }));
    return { count: json.resultCount ?? apps.length, apps, url };
  } catch {
    return { count: 0, apps: [], url };
  }
}

export type ShelfSatisfaction = {
  /** 0..1 — how well the existing shelf actually serves the job. */
  score: number;
  /** Rating-count-weighted mean stars, so a 5★ app with 3 votes cannot dominate. */
  weightedStars: number;
  totalRatings: number;
  ratedApps: number;
};

/**
 * How satisfied the existing shelf leaves people — the missing half of supply.
 *
 * Outcome-Driven Innovation puts opportunity on *unsatisfied* importance, not on the absence
 * of solutions. Counting apps alone scores 40 apps at 3.1 stars the same as 40 at 4.6, though
 * the first is the better target: demand is proven and incumbents are weak.
 *
 * Computed over the hits we fetched (the top ~25), which is what a searching user actually
 * sees, not the whole long tail behind `resultCount`.
 *
 * Returns null when no hit carries rating data — absent data must not read as bad ratings.
 */
export function shelfSatisfaction(apps: ItunesAppHit[]): ShelfSatisfaction | null {
  const rated = apps.filter(
    (a) => typeof a.averageUserRating === "number" && (a.userRatingCount ?? 0) > 0,
  );
  if (rated.length === 0) return null;

  const totalRatings = rated.reduce((sum, a) => sum + (a.userRatingCount ?? 0), 0);
  if (totalRatings <= 0) return null;

  const weightedStars =
    rated.reduce((sum, a) => sum + (a.averageUserRating ?? 0) * (a.userRatingCount ?? 0), 0) /
    totalRatings;

  // App Store ratings skew high — measured across watchlist niches they sit at 4.3–4.9 — so
  // anchor the band at 3.0–4.8 where the data actually lives instead of the nominal 1–5.
  const quality = Math.max(0, Math.min(1, (weightedStars - 3) / 1.8));
  // Few total ratings means the shelf is stocked but unproven — also weak supply.
  const adoption = Math.min(Math.log1p(totalRatings) / Math.log(50_000), 1);

  return {
    // Adoption carries more weight than stars: because ratings skew high, quality saturates
    // and barely separates niches, while review volume separates them cleanly. An unused shelf
    // is the common real case, not a badly-rated one.
    score: quality * 0.4 + adoption * 0.6,
    weightedStars,
    totalRatings,
    ratedApps: rated.length,
  };
}
