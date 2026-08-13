import { createServerFn } from "@tanstack/react-start";

import type { WatchItem } from "@/lib/watchlist";
import type { GeoSelection } from "@/lib/geo.types";

export type { DiscoverCandidate } from "./discover.types";

export const discoverObservations = createServerFn({ method: "POST" })
  .validator((data: unknown): GeoSelection => {
    const input = data as Partial<GeoSelection>;
    const countryCode = String(input.countryCode ?? "DE").toUpperCase();
    if (!/^[A-Z]{2}$/.test(countryCode)) throw new Error("Invalid country");
    return {
      countryCode,
      countryName: String(input.countryName ?? countryCode).slice(0, 80),
      city: input.city ? String(input.city).slice(0, 80) : null,
      languageCode: String(input.languageCode ?? "en").slice(0, 8),
      source: input.source === "manual" ? "manual" : "fallback",
    };
  })
  .handler(async ({ data }) => {
    const { discoverOpportunitySpaces } = await import("./observations.server");
    return discoverOpportunitySpaces(data);
  });

export const saveAppSeed = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const id = String((data as { id?: unknown })?.id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("This direction is not archived yet");
    return { id };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_seeds")
      .update({ is_saved: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { persisted: true };
  });

export const runDiscover = createServerFn({ method: "GET" }).handler(async () => {
  const { discoverCandidates } = await import("./discover.server");
  return discoverCandidates();
});

export const listPromoted = createServerFn({ method: "GET" }).handler(async () => {
  const { listPromotedWatchlist } = await import("./watchlist.server");
  return listPromotedWatchlist();
});

export const promoteCandidate = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const d = data as Partial<WatchItem>;
    if (!d || typeof d !== "object") throw new Error("Invalid payload");
    const keyword = String(d.keyword ?? "").trim();
    const category = String(d.category ?? "discovered").trim();
    const tags = Array.isArray(d.tags)
      ? d.tags.map((t) => String(t).trim()).filter(Boolean)
      : ["discovered"];
    if (keyword.length < 3) throw new Error("Keyword too short");
    return { keyword, category, tags } satisfies WatchItem;
  })
  .handler(async ({ data }) => {
    const { promoteToWatchlist } = await import("./watchlist.server");
    return promoteToWatchlist(data);
  });
