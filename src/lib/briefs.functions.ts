import { createServerFn } from "@tanstack/react-start";

import type { Brief } from "./briefs.server";
import type { AppSeed } from "./observations.types";

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

export type BriefOpportunitySpace = {
  keyword: string;
  observationCount: number;
  observationSetHash: string;
  seeds: AppSeed[];
  available: boolean;
};

export const getBriefOpportunitySpace = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const slug = String((data as { slug?: unknown })?.slug ?? "").trim();
    if (!slug || slug.length > 120) throw new Error("Invalid signal slug");
    return { slug };
  })
  .handler(async ({ data }): Promise<BriefOpportunitySpace> => {
    const { createHash } = await import("node:crypto");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signal, error } = await supabaseAdmin
      .from("signals")
      .select("id, keyword")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error || !signal) throw new Error(error?.message ?? "Signal not found");
    try {
      const { data: observations, error: observationError } = await supabaseAdmin
        .from("signal_observations")
        .select("id, evidence_hash")
        .eq("signal_id", signal.id);
      if (observationError) throw observationError;
      const ids = (observations ?? []).map((row) => row.id);
      const observationSetHash = createHash("sha256")
        .update(
          (observations ?? [])
            .map((row) => row.evidence_hash)
            .sort()
            .join("\n") || "none",
        )
        .digest("hex");
      if (ids.length === 0) {
        return {
          keyword: signal.keyword,
          observationCount: 0,
          observationSetHash,
          seeds: [],
          available: true,
        };
      }
      const { data: rows } = await supabaseAdmin
        .from("app_seeds")
        .select(
          "id, family, title, user_type, problem, concept, variations, why_interesting, interesting_score, commercial_score, buildability_score, validation_step, model, model_version, source_hash",
        )
        .in("observation_id", ids)
        .order("interesting_score", { ascending: false });
      const seeds: AppSeed[] = (rows ?? []).map((row) => ({
        id: row.id,
        family: row.family as AppSeed["family"],
        title: row.title,
        userType: row.user_type,
        problem: row.problem,
        concept: row.concept,
        variations: Array.isArray(row.variations) ? row.variations.map(String) : [],
        whyInteresting: row.why_interesting,
        interestingScore: row.interesting_score,
        commercialScore: row.commercial_score,
        buildabilityScore: row.buildability_score,
        validationStep: row.validation_step,
        provenance: "derived",
        model: row.model,
        modelVersion: row.model_version,
        sourceHash: row.source_hash,
      }));
      return {
        keyword: signal.keyword,
        observationCount: ids.length,
        observationSetHash,
        seeds,
        available: true,
      };
    } catch {
      return {
        keyword: signal.keyword,
        observationCount: 0,
        observationSetHash: "legacy",
        seeds: [],
        available: false,
      };
    }
  });

export const getBrief = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const input = data as {
      slug?: unknown;
      geoKey?: unknown;
      observationSetHash?: unknown;
      direction?: unknown;
    };
    const slug = input?.slug;
    if (typeof slug !== "string" || slug.length === 0) throw new Error("slug is required");
    return {
      slug,
      geoKey: String(input.geoKey ?? "GLOBAL").slice(0, 120),
      observationSetHash: String(input.observationSetHash ?? "legacy").slice(0, 128),
      direction: input.direction ? String(input.direction).slice(0, 1200) : null,
    };
  })
  .handler(async ({ data }): Promise<BriefResult> => {
    const { buildBriefForSlug } = await import("./briefs.pipeline.server");
    return buildBriefForSlug(data);
  });
