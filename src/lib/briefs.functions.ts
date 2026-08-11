import { createServerFn } from "@tanstack/react-start";

import type { Brief } from "./briefs.server";

export type BriefResult = {
  keyword: string;
  category: string;
  tags: string[];
  demand: number;
  supply: number;
  opportunity: number;
  leadWeeks: number;
  why: string | null;
  brief: Brief;
  cached: boolean;
  createdAt: string;
};

export const getBrief = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const slug = (data as { slug?: unknown })?.slug;
    if (typeof slug !== "string" || slug.length === 0) throw new Error("slug is required");
    return { slug };
  })
  .handler(async ({ data }): Promise<BriefResult> => {
    const { buildBriefForSlug } = await import("./briefs.pipeline.server");
    return buildBriefForSlug(data.slug);
  });