import { createHash } from "node:crypto";

import { geoKey, type GeoSelection } from "./geo.types";
import type {
  AppSeed,
  EvidenceType,
  ObservationDiscoveryResult,
  OpportunityFamily,
  OpportunitySpace,
  SignalObservation,
} from "./observations.types";

const MODEL = "claude-sonnet-4-20250514";
const MODEL_VERSION = "observation-space-v1";

const PATTERNS: Array<{
  type: EvidenceType;
  test: RegExp;
}> = [
  {
    type: "workaround",
    test: /\b(spreadsheet|excel|google sheets|notion|manual copy|copy.?paste|bookmark|script|telegram bot|discord bot)\b/i,
  },
  {
    type: "complaint",
    test: /\b(i wish|why (?:isn.t|is there no|doesn.t)|there.s no|hate|frustrat|painful|still have to)\b/i,
  },
  {
    type: "fragmentation",
    test: /\b(three tools|multiple tools|several apps|switch between|stitch|fragment|all in one|one place)\b/i,
  },
  {
    type: "coordination",
    test: /\b(schedule|availability|appointment|coordinate|group|club|shared equipment|volunteer|booking)\b/i,
  },
  {
    type: "new-capability",
    test: /\b(new api|api released|open data|new model|new sensor|new hardware|now possible)\b/i,
  },
  {
    type: "new-constraint",
    test: /\b(regulation|compliance|mandate|pricing change|deprecated|shutdown|ban|tax|invoice law)\b/i,
  },
  {
    type: "manual-workflow",
    test: /\b(manually|by hand|email back and forth|phone calls|paper form|retype)\b/i,
  },
  {
    type: "discovery",
    test: /\b(find|discover|where can i|near me|directory|list of)\b/i,
  },
];

type RawHit = {
  source: string;
  sourceType: string;
  title: string;
  text: string;
  url: string | null;
  observedAt: string | null;
};

export function classifyEvidence(text: string): EvidenceType {
  return PATTERNS.find((pattern) => pattern.test.test(text))?.type ?? "other";
}

export function evidenceHash(hit: Pick<RawHit, "source" | "url" | "text">): string {
  return createHash("sha256")
    .update(`${hit.source}\n${hit.url ?? ""}\n${hit.text.trim()}`)
    .digest("hex");
}

function canonicalQuery(title: string): string {
  return title
    .replace(/^(Ask HN|Show HN|Tell HN)\s*:\s*/i, "")
    .replace(/[?!.]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

function cleanSourceText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&#x2F;|&#47;/gi, "/")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function toObservation(hit: RawHit, geo: GeoSelection): SignalObservation {
  const title = cleanSourceText(hit.title);
  const body = cleanSourceText(hit.text);
  const evidenceText = `${title}${body && body !== title ? ` — ${body}` : ""}`.slice(0, 1200);
  const evidenceType = classifyEvidence(evidenceText);
  return {
    canonicalQuery: canonicalQuery(title),
    source: hit.source,
    sourceType: hit.sourceType,
    evidenceUrl: hit.url,
    evidenceText,
    observedBehavior: body.slice(0, 500) || title,
    evidenceType,
    friction:
      evidenceType === "complaint" || evidenceType === "manual-workflow"
        ? "The observed workflow creates repeated avoidable effort."
        : null,
    workaround:
      evidenceType === "workaround"
        ? (evidenceText.match(
            /\b(spreadsheet|excel|google sheets|notion|script|telegram bot|discord bot|bookmarks?)\b/i,
          )?.[0] ?? "manual workaround")
        : null,
    provenance: "measured",
    evidenceHash: evidenceHash(hit),
    observedAt: hit.observedAt,
    geo,
  };
}

async function tavilyObservations(geo: GeoSelection): Promise<RawHit[]> {
  const key = process.env["TAVILY_API_KEY"];
  if (!key) return [];
  const location = geo.city ? `${geo.city} ${geo.countryName}` : geo.countryName;
  const queries = [
    `"I use a spreadsheet" OR "still have to manually" app ${location}`,
    `"why isn't there an app" OR "is there a tool" ${location}`,
    `"alternative to" OR "all in one place" small business ${location}`,
    `"appointment availability" OR "booking is fragmented" ${location}`,
    `"new API" OR "open dataset" app opportunity ${geo.countryName}`,
  ];
  const groups = await Promise.all(
    queries.map(async (query) => {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({
          query,
          topic: "general",
          max_results: 6,
          search_depth: "basic",
          include_answer: false,
        }),
      });
      if (!response.ok) return [];
      const data = (await response.json()) as {
        results?: Array<{
          title?: string;
          content?: string;
          url?: string;
          published_date?: string;
        }>;
      };
      return (data.results ?? [])
        .filter((result) => result.title && result.url)
        .map<RawHit>((result) => ({
          source: "Tavily",
          sourceType: "web",
          title: result.title!,
          text: result.content?.trim() || result.title!,
          url: result.url!,
          observedAt: result.published_date ?? null,
        }));
    }),
  );
  return groups.flat();
}

async function hackerNewsObservations(): Promise<RawHit[]> {
  const queries = ["spreadsheet", "why isn't there", "tool for", "manually", "alternative to"];
  const groups = await Promise.all(
    queries.map(async (query) => {
      const url = new URL("https://hn.algolia.com/api/v1/search_by_date");
      url.searchParams.set("tags", "ask_hn");
      url.searchParams.set("hitsPerPage", "12");
      url.searchParams.set("query", query);
      const response = await fetch(url, { headers: { accept: "application/json" } });
      if (!response.ok) return [];
      const data = (await response.json()) as {
        hits?: Array<{
          title?: string;
          story_text?: string;
          comment_text?: string;
          objectID?: string;
          created_at?: string;
        }>;
      };
      return (data.hits ?? [])
        .filter((hit) => hit.title)
        .map<RawHit>((hit) => ({
          source: "Hacker News Ask",
          sourceType: "community",
          title: hit.title!,
          text: hit.story_text || hit.comment_text || hit.title!,
          url: hit.objectID ? `https://news.ycombinator.com/item?id=${hit.objectID}` : null,
          observedAt: hit.created_at ?? null,
        }));
    }),
  );
  return groups.flat();
}

function familyFallback(observation: SignalObservation): OpportunityFamily[] {
  const byType: Partial<Record<EvidenceType, OpportunityFamily[]>> = {
    workaround: ["tracking", "automation", "visualization", "aggregation", "utility"],
    complaint: ["utility", "monitoring", "automation", "comparison", "discovery"],
    fragmentation: ["aggregation", "comparison", "automation", "monitoring", "utility"],
    coordination: ["coordination", "monitoring", "discovery", "marketplace", "prediction"],
    "new-capability": ["automation", "creator", "prediction", "utility", "visualization"],
    "new-constraint": ["monitoring", "automation", "tracking", "translation", "utility"],
    "manual-workflow": ["automation", "tracking", "utility", "aggregation", "visualization"],
    discovery: ["discovery", "aggregation", "monitoring", "comparison", "marketplace"],
  };
  return (
    byType[observation.evidenceType] ?? [
      "utility",
      "discovery",
      "tracking",
      "automation",
      "creator",
    ]
  );
}

function fallbackSeeds(observation: SignalObservation): AppSeed[] {
  const templates: Record<
    OpportunityFamily,
    { title: string; concept: string; variations: string[] }
  > = {
    discovery: {
      title: "Find the missing answer",
      concept:
        "A focused directory that helps people find the exact tool, provider or resource absent from the observed workflow.",
      variations: ["neighbourhood index", "expert-curated list", "community recommendations"],
    },
    monitoring: {
      title: "Change watch",
      concept:
        "A watcher that alerts people when the underlying availability, rule, price or status changes.",
      variations: ["email digest", "browser watcher", "team alert feed"],
    },
    automation: {
      title: "One-click handoff",
      concept:
        "A narrow automation that replaces the repeated copy, re-entry or tool-switching sequence in the evidence.",
      variations: ["local desktop helper", "workflow webhook", "inbox-to-record"],
    },
    coordination: {
      title: "Shared availability board",
      concept:
        "A lightweight coordination surface where the people in the workflow can expose availability and settle the next action.",
      variations: ["group scheduling", "shared queue", "volunteer rota"],
    },
    aggregation: {
      title: "Single operating view",
      concept:
        "A read-only layer that combines the scattered sources named or implied by the workaround into one dependable view.",
      variations: ["daily digest", "unified inbox", "local data board"],
    },
    prediction: {
      title: "Friction forecaster",
      concept:
        "A forecasting tool that uses the workflow's own history to flag where delay, shortage or failure is likely next.",
      variations: ["capacity forecast", "deadline risk", "demand pulse"],
    },
    tracking: {
      title: "Workaround ledger",
      concept:
        "A tiny tracker built around the exact repeated action in the evidence, with history and a clear next step.",
      variations: ["personal log", "shared progress board", "proof-of-work timeline"],
    },
    comparison: {
      title: "Switching guide",
      concept:
        "A transparent comparison of available options against the constraints revealed by this complaint or workaround.",
      variations: ["cost calculator", "feature matrix", "migration recommender"],
    },
    translation: {
      title: "Local rules translator",
      concept:
        "A translation layer that turns unfamiliar language, policy or platform terminology into the user's local workflow.",
      variations: ["plain-language explainer", "field mapper", "locale checklist"],
    },
    visualization: {
      title: "Bottleneck map",
      concept:
        "A visual map of where work waits, repeats or falls between tools so the next intervention becomes obvious.",
      variations: ["timeline", "flow map", "exception heatmap"],
    },
    marketplace: {
      title: "Helper exchange",
      concept:
        "A constrained marketplace that matches people blocked by this friction with someone who has capacity to resolve it.",
      variations: ["local helpers", "peer exchange", "verified specialists"],
    },
    creator: {
      title: "Workflow kit builder",
      concept:
        "A creator tool for turning a successful workaround into a reusable template other people can adapt.",
      variations: ["template studio", "recipe marketplace", "guided generator"],
    },
    utility: {
      title: "Tiny friction remover",
      concept:
        "A single-purpose utility that removes the most repetitive step without replacing the rest of the user's setup.",
      variations: ["menu-bar tool", "browser extension", "mobile shortcut"],
    },
  };
  return familyFallback(observation).map((family, index) => {
    const template = templates[family];
    return {
      family,
      title: template.title,
      userType: "People exhibiting the observed behavior",
      problem: observation.observedBehavior,
      concept: template.concept,
      variations: template.variations,
      whyInteresting: `It reframes the same ${observation.evidenceType} evidence as a ${family} product, without claiming new demand.`,
      interestingScore: 82 - index * 5,
      commercialScore: 58 - index * 3,
      buildabilityScore: 88 - index * 4,
      validationStep: "Interview three people who use the observed workaround before building.",
      provenance: "derived",
      model: "deterministic-fallback",
      modelVersion: MODEL_VERSION,
      sourceHash: observation.evidenceHash,
    };
  });
}

function clampScore(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : 50;
}

async function deriveSeeds(observation: SignalObservation): Promise<AppSeed[]> {
  const key = process.env["ANTHROPIC_API_KEY"];
  if (!key) return fallbackSeeds(observation);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2200,
      system:
        "You explore app opportunity spaces for creative solo builders. The evidence is authoritative. Never invent demand, deltas, quotes, users, or measurements. Return JSON only.",
      messages: [
        {
          role: "user",
          content: `Observed evidence (${observation.provenance}):
Source: ${observation.source}
Location context: ${observation.geo.city ?? "country"} / ${observation.geo.countryCode}
Evidence type: ${observation.evidenceType}
Evidence: ${observation.evidenceText}

Derive 5 genuinely different software directions. Use different families from:
discovery, monitoring, automation, coordination, aggregation, prediction, tracking, comparison, translation, visualization, marketplace, creator, utility.

Return {"seeds":[{family,title,userType,problem,concept,variations,whyInteresting,interestingScore,commercialScore,buildabilityScore,validationStep}]}.
Scores are subjective 0-100 lenses, not market measurements. variations is 2-4 strings.`,
        },
      ],
    }),
  });
  if (!response.ok) return fallbackSeeds(observation);
  const payload = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  try {
    const text = payload.content?.find((item) => item.type === "text")?.text ?? "";
    const parsed = JSON.parse(text.replace(/^```json\s*|```$/g, "").trim()) as {
      seeds?: Array<Record<string, unknown>>;
    };
    const allowed = new Set<OpportunityFamily>([
      "discovery",
      "monitoring",
      "automation",
      "coordination",
      "aggregation",
      "prediction",
      "tracking",
      "comparison",
      "translation",
      "visualization",
      "marketplace",
      "creator",
      "utility",
    ]);
    const seeds = (parsed.seeds ?? [])
      .map<AppSeed | null>((seed) => {
        const family = String(seed["family"] ?? "") as OpportunityFamily;
        if (!allowed.has(family)) return null;
        return {
          family,
          title: String(seed["title"] ?? `${family} angle`).slice(0, 100),
          userType: String(seed["userType"] ?? "People in the evidence").slice(0, 180),
          problem: String(seed["problem"] ?? observation.observedBehavior).slice(0, 500),
          concept: String(seed["concept"] ?? "").slice(0, 700),
          variations: Array.isArray(seed["variations"])
            ? seed["variations"].map(String).filter(Boolean).slice(0, 4)
            : [],
          whyInteresting: String(seed["whyInteresting"] ?? "").slice(0, 500),
          interestingScore: clampScore(seed["interestingScore"]),
          commercialScore: clampScore(seed["commercialScore"]),
          buildabilityScore: clampScore(seed["buildabilityScore"]),
          validationStep: String(seed["validationStep"] ?? "").slice(0, 500),
          provenance: "derived",
          model: MODEL,
          modelVersion: MODEL_VERSION,
          sourceHash: observation.evidenceHash,
        };
      })
      .filter((seed): seed is AppSeed => Boolean(seed));
    return seeds.length >= 3 ? seeds.slice(0, 8) : fallbackSeeds(observation);
  } catch {
    return fallbackSeeds(observation);
  }
}

async function persistSpace(space: OpportunitySpace): Promise<OpportunitySpace> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const observation = space.observation;
    const { data: row, error } = await supabaseAdmin
      .from("signal_observations")
      .upsert(
        {
          canonical_query: observation.canonicalQuery,
          geo_key: geoKey(observation.geo),
          source: observation.source,
          source_type: observation.sourceType,
          evidence_url: observation.evidenceUrl,
          evidence_text: observation.evidenceText,
          observed_behavior: observation.observedBehavior,
          evidence_type: observation.evidenceType,
          friction: observation.friction,
          workaround: observation.workaround,
          provenance: observation.provenance,
          evidence_hash: observation.evidenceHash,
          observed_at: observation.observedAt,
        },
        { onConflict: "evidence_hash" },
      )
      .select("id")
      .single();
    if (error || !row) return space;

    for (const seed of space.appSeeds) {
      await supabaseAdmin.from("app_seeds").upsert(
        {
          observation_id: row.id,
          family: seed.family,
          title: seed.title,
          user_type: seed.userType,
          problem: seed.problem,
          concept: seed.concept,
          variations: seed.variations,
          why_interesting: seed.whyInteresting,
          interesting_score: seed.interestingScore,
          commercial_score: seed.commercialScore,
          buildability_score: seed.buildabilityScore,
          validation_step: seed.validationStep,
          provenance: seed.provenance,
          source_hash: seed.sourceHash,
          model: seed.model,
          model_version: seed.modelVersion,
        },
        { onConflict: "observation_id,family,source_hash,model_version" },
      );
    }
    return {
      observation: { ...observation, id: row.id },
      appSeeds: space.appSeeds,
    };
  } catch {
    // Migration may not be applied yet. The live result still works for this request.
    return space;
  }
}

export async function discoverOpportunitySpaces(
  geo: GeoSelection,
): Promise<ObservationDiscoveryResult> {
  const hits = [...(await hackerNewsObservations()), ...(await tavilyObservations(geo))];
  const unique = new Map<string, RawHit>();
  for (const hit of hits) {
    const hash = evidenceHash(hit);
    if (!unique.has(hash) && classifyEvidence(`${hit.title} ${hit.text}`) !== "other") {
      unique.set(hash, hit);
    }
  }

  const observations = [...unique.values()]
    .map((hit) => toObservation(hit, geo))
    .sort((a, b) => {
      const priority: EvidenceType[] = [
        "workaround",
        "complaint",
        "manual-workflow",
        "fragmentation",
        "coordination",
        "new-capability",
        "new-constraint",
        "discovery",
        "other",
      ];
      return priority.indexOf(a.evidenceType) - priority.indexOf(b.evidenceType);
    })
    .slice(0, 10);

  const spaces: OpportunitySpace[] = [];
  for (const observation of observations) {
    const appSeeds = await deriveSeeds(observation);
    spaces.push(await persistSpace({ observation, appSeeds }));
  }

  return {
    spaces,
    generatedAt: new Date().toISOString(),
    geo,
    note:
      spaces.length > 0
        ? "Evidence is measured from source text; friction and app directions are explicitly derived."
        : "No qualifying workaround or complaint evidence found. Try another market or refresh later.",
  };
}
