/**
 * Self-run GEO citation sweep — the fallback for Sitefire.
 *
 *   npm run geo:sweep -- --limit 1        # smoke test, one prompt, ~$0.02
 *   npm run geo:sweep                     # full 36-prompt run
 *   npm run geo:sweep -- --model claude-sonnet-5
 *
 * Asks a search-grounded model each tracked prompt and records which products it
 * actually cites. Writes a dated run file to server/geo-runs/; geo-merge.ts folds
 * that into src/data/ai-citation-gaps.json.
 *
 * Why grounded: an ungrounded model answers from training priors and names brands
 * with no URLs. Sitefire measures AI answers *with retrieval*. Without the web
 * search tool this produces a different measurement wearing the same field names.
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

import promptSet from "../src/data/geo-prompts.json" with { type: "json" };

type Niche = (typeof promptSet.niches)[number];

/** Models that support the newer dynamic-filtering search tool. Others get the basic one. */
const DYNAMIC_SEARCH_MODELS = [
  "claude-opus-5",
  "claude-opus-4-8",
  "claude-opus-4-7",
  "claude-opus-4-6",
  "claude-sonnet-5",
  "claude-sonnet-4-6",
];

function searchTool(model: string) {
  return DYNAMIC_SEARCH_MODELS.includes(model)
    ? { type: "web_search_20260209" as const, name: "web_search" as const, max_uses: 4 }
    : { type: "web_search_20250305" as const, name: "web_search" as const, max_uses: 4 };
}

/** Mirrors the optional fields on AiCitationGap in src/lib/ai-citation-gap.ts. */
const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    citationShape: {
      type: "string",
      enum: ["none", "fragmented", "dominated"],
      description:
        "dominated = 1-2 named products recur as the clear answer. fragmented = several named products, none dominant. none = no actual software product named (advice, directories, or hardware only).",
    },
    answerType: {
      type: "string",
      enum: ["product", "directory", "advice", "hardware"],
      description: "What the answer leans on when it has no single product to name.",
    },
    cited: {
      type: "array",
      items: { type: "string" },
      description:
        "Product or brand names actually named in the answer, or bare domains if a source was cited instead. Empty if none. Never invent entries.",
    },
    localCited: {
      type: "boolean",
      description: "True if at least one named product is specific to the prompt's country.",
    },
    note: { type: "string", description: "One sentence, factual, no salesmanship." },
  },
  required: ["citationShape", "answerType", "cited", "localCited", "note"],
  additionalProperties: false,
} as const;

const EXTRACT_SYSTEM = `You classify how an AI answer cites products, for market-gap research.

Search the web before answering, then answer the user's question as you normally would.
Finally, classify YOUR OWN answer against the schema.

Rules that matter:
- "cited" means products you actually named. If you named none, return an empty array.
  Never add a plausible-sounding product you did not name.
- A category page, blog, listicle, or directory is not a product. If your answer only
  pointed at those, citationShape is "none" and answerType is "directory" or "advice".
- Hardware vendors are not software products. answerType "hardware".
- "dominated" requires the same 1-2 products being the obvious answer, not merely listed.
- Be willing to return "none". An honest empty result is the useful signal here.`;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

type PromptResult = {
  slug: string;
  keyword: string;
  archetype: string;
  prompt: string;
  country: string;
  language: string;
  extraction: {
    citationShape: "none" | "fragmented" | "dominated";
    answerType: "product" | "directory" | "advice" | "hardware";
    cited: string[];
    localCited: boolean;
    note: string;
  } | null;
  /** Raw answer text, kept so a row is auditable later rather than trusted blind. */
  answer: string;
  searchQueries: string[];
  error?: string;
};

async function runPrompt(
  client: Anthropic,
  model: string,
  niche: Niche,
  p: Niche["prompts"][number],
): Promise<PromptResult> {
  const base: PromptResult = {
    slug: niche.slug,
    keyword: niche.keyword,
    archetype: p.archetype,
    prompt: p.text,
    country: niche.country,
    language: niche.language,
    extraction: null,
    answer: "",
    searchQueries: [],
  };

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 8000,
      system: EXTRACT_SYSTEM,
      tools: [searchTool(model)],
      output_config: { format: { type: "json_schema", schema: EXTRACTION_SCHEMA } },
      messages: [
        {
          role: "user",
          content: `Country context: ${niche.country}. Answer language: ${niche.language}.\n\nQuestion: ${p.text}`,
        },
      ],
    });

    // Server tools run in a loop; pause_turn means it hit the iteration cap mid-search.
    if (response.stop_reason === "pause_turn") {
      return { ...base, error: "pause_turn — search loop did not finish; re-run this prompt" };
    }
    if (response.stop_reason === "refusal") {
      return { ...base, error: "refusal" };
    }

    for (const block of response.content) {
      if (block.type === "text") base.answer += block.text;
      if (block.type === "server_tool_use" && block.name === "web_search") {
        const q = (block.input as { query?: string })?.query;
        if (q) base.searchQueries.push(q);
      }
    }

    // With output_config.format the text is the JSON document.
    base.extraction = JSON.parse(base.answer);
    return base;
  } catch (error) {
    return { ...base, error: (error as Error).message };
  }
}

/** Bounded concurrency — enough to be quick, low enough not to trip rate limits. */
async function pool<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]!);
      }
    }),
  );
  return out;
}

async function main() {
  if (!process.env["ANTHROPIC_API_KEY"]) {
    console.error("ANTHROPIC_API_KEY missing — add it to .env and re-run.");
    process.exit(1);
  }

  const model = arg("model") ?? "claude-haiku-4-5";
  const limit = Number(arg("limit") ?? Infinity);

  const jobs = promptSet.niches.flatMap((n) => n.prompts.map((p) => ({ niche: n, p })));
  const selected = jobs.slice(0, Number.isFinite(limit) ? limit : jobs.length);

  console.log(
    `sweep: ${selected.length}/${jobs.length} prompts · model ${model} · ` +
      `search tool ${searchTool(model).type}`,
  );

  const client = new Anthropic();
  const started = new Date().toISOString();

  let done = 0;
  const results = await pool(selected, 4, async ({ niche, p }) => {
    const r = await runPrompt(client, model, niche, p);
    done += 1;
    const status = r.error
      ? `ERROR ${r.error.slice(0, 48)}`
      : `${r.extraction?.citationShape}/${r.extraction?.answerType} cited=${r.extraction?.cited.length}`;
    console.log(`  [${done}/${selected.length}] ${niche.slug} ${p.archetype} — ${status}`);
    return r;
  });

  const dir = "server/geo-runs";
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = `${dir}/${started.slice(0, 10)}-${model}.json`;
  writeFileSync(
    path,
    JSON.stringify({ startedAt: started, model, engine: "anthropic", results }, null, 2),
  );

  const ok = results.filter((r) => r.extraction).length;
  const controls = results.filter(
    (r) => promptSet.niches.find((n) => n.slug === r.slug)?.control && r.extraction,
  );
  const controlsDominated = controls.filter((r) => r.extraction!.citationShape === "dominated");

  console.log(`\nwrote ${path}`);
  console.log(`extracted ${ok}/${selected.length}`);
  if (controls.length) {
    console.log(
      `controls dominated: ${controlsDominated.length}/${controls.length}` +
        (controlsDominated.length === 0
          ? "  <-- SUSPECT: known-crowded niches came back open. Do not trust this run."
          : ""),
    );
  }
}

void main();
