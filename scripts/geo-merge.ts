/**
 * Fold sweep runs into src/data/ai-citation-gaps.json.
 *
 *   npm run geo:merge                 # merge every run in server/geo-runs/
 *   npm run geo:merge -- --dry        # print what would change, write nothing
 *
 * Aggregates the 3 prompts per niche into one Radar row, sets status "anthropic"
 * (never "sitefire" — provenance stays honest), and computes engineDisagreement
 * across engines when more than one engine has been run.
 *
 * Rows already marked "sitefire" are left alone: real third-party measurement
 * outranks our own sweep. Demo rows are replaced.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";

import promptSet from "../src/data/geo-prompts.json" with { type: "json" };

type Shape = "none" | "fragmented" | "dominated";
type AnswerType = "product" | "directory" | "advice" | "hardware";

type RunResult = {
  slug: string;
  keyword: string;
  archetype: string;
  extraction: {
    citationShape: Shape;
    answerType: AnswerType;
    cited: string[];
    localCited: boolean;
    note: string;
  } | null;
  error?: string;
};

type Run = { startedAt: string; model: string; engine: string; results: RunResult[] };

/**
 * The `cited` list is the auditable artifact; the shape label is a claim about it.
 * A row asserting "fragmented" or "dominated" while listing nothing cannot be
 * checked, so it is demoted to "none". Conservative on purpose — an unverifiable
 * citation claim is exactly what must not reach a Radar badge or an outreach email.
 */
function normalize(ex: {
  citationShape: Shape;
  cited: string[];
}): Shape {
  return ex.cited.length === 0 ? "none" : ex.citationShape;
}

/** Most common value, ties broken by the more conservative (more-cited) shape. */
function majorityShape(shapes: Shape[]): Shape {
  const rank: Record<Shape, number> = { dominated: 3, fragmented: 2, none: 1 };
  const counts = new Map<Shape, number>();
  for (const s of shapes) counts.set(s, (counts.get(s) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || rank[b[0]] - rank[a[0]])[0]![0];
}

function majorityType(types: AnswerType[]): AnswerType {
  const counts = new Map<AnswerType, number>();
  for (const t of types) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
}

/**
 * `gap` is the headline badge; citationShape carries the real nuance (see CLAUDE.md).
 * "no clear local/niche product" is the rubric's definition of a high gap, so a
 * fragmented field with no local product still reads high.
 */
function gapLevel(shape: Shape, localCited: boolean): "high" | "medium" | "low" {
  if (shape === "dominated") return "low";
  if (shape === "none") return "high";
  return localCited ? "medium" : "high";
}

function main() {
  const dry = process.argv.includes("--dry");
  const dir = "server/geo-runs";

  const runs: Run[] = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8")) as Run);

  if (runs.length === 0) {
    console.error(`no runs in ${dir}/ — run npm run geo:sweep first`);
    process.exit(1);
  }

  const engines = [...new Set(runs.map((r) => r.engine))];
  console.log(`merging ${runs.length} run(s) across engine(s): ${engines.join(", ")}`);

  const gapsPath = "src/data/ai-citation-gaps.json";
  const file = JSON.parse(readFileSync(gapsPath, "utf8")) as {
    updatedAt: string;
    notes: string;
    schema?: unknown;
    gaps: Array<Record<string, unknown>>;
  };

  const bySlug = new Map(file.gaps.map((g) => [g["slug"] as string, g]));
  let written = 0;
  let keptSitefire = 0;

  for (const niche of promptSet.niches) {
    const existing = bySlug.get(niche.slug);
    if (existing?.["status"] === "sitefire") {
      keptSitefire += 1;
      continue;
    }

    // Per-engine aggregate, so cross-engine comparison is apples to apples.
    const perEngine = engines
      .map((engine) => {
        const rows = runs
          .filter((r) => r.engine === engine)
          .flatMap((r) => r.results)
          .filter((x) => x.slug === niche.slug && x.extraction);
        if (rows.length === 0) return null;
        const ex = rows.map((r) => r.extraction!);
        return {
          engine,
          shape: majorityShape(ex.map(normalize)),
          answerType: majorityType(ex.map((e) => e.answerType)),
          cited: [...new Set(ex.flatMap((e) => e.cited))],
          localCited: ex.some((e) => e.localCited),
          notes: ex.map((e) => e.note),
          shapes: ex.map(normalize),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (perEngine.length === 0) continue;

    const shape = majorityShape(perEngine.map((e) => e.shape));
    const localCited = perEngine.some((e) => e.localCited);
    const cited = [...new Set(perEngine.flatMap((e) => e.cited))];

    // Strictly cross-engine: different engines reached different conclusions.
    const engineDisagreement =
      perEngine.length > 1 && new Set(perEngine.map((e) => e.shape)).size > 1;

    const answerType = majorityType(perEngine.map((e) => e.answerType));

    // Row-level consistency. `cited` holds products OR directories/domains, and
    // answerType says which. So "none" alongside cited directories is coherent
    // (repair cafés: real listings, no product) — but "none" alongside cited
    // *products* is not: some phrasing did surface products, others missed them.
    // That is an unstable field, which is "fragmented", not empty.
    const unstableProducts = shape === "none" && answerType === "product" && cited.length > 0;
    const finalShape: Shape = unstableProducts ? "fragmented" : shape;

    // Prompt-level instability is a different thing from engine disagreement —
    // say it in prose, don't overload engineDisagreement with it.
    const promptsUnstable =
      unstableProducts || perEngine.some((e) => new Set(e.shapes).size > 1);
    // Some prompts return a throwaway note; take the first substantive one.
    const notes = perEngine.flatMap((e) => e.notes).map((n) => n.trim());
    const note =
      (notes.find((n) => n.length > 40) ?? notes.find((n) => n.length > 0) ?? "") +
      (promptsUnstable ? " Prompt phrasings disagreed on shape for this niche." : "");

    const row = {
      slug: niche.slug,
      keyword: niche.keyword,
      gap: gapLevel(finalShape, localCited),
      status: "anthropic",
      prompt: niche.prompts[0]!.text,
      cited: cited.slice(0, 8),
      localCited,
      note,
      citationShape: finalShape,
      answerType,
      engines: engines.slice(),
      engineDisagreement,
    };

    if (existing) Object.assign(existing, row);
    else file.gaps.push(row);
    written += 1;

    console.log(
      `  ${niche.slug.padEnd(26)} ${row.gap.padEnd(6)} ${finalShape.padEnd(10)} ` +
        `${row.answerType.padEnd(9)} cited=${cited.length}` +
        (engineDisagreement ? " ENGINES-DISAGREE" : ""),
    );
  }

  file.updatedAt = new Date().toISOString().slice(0, 10);
  file.notes =
    `Rows with status "anthropic" come from scripts/geo-sweep.ts (self-run, search-grounded) — ` +
    `not third-party measurement. "sitefire" rows are preserved and outrank a sweep. ` +
    `"demo" rows are placeholders and must never be presented as findings.`;

  if (dry) {
    console.log(`\n--dry: ${written} row(s) would change, ${keptSitefire} sitefire row(s) kept`);
    return;
  }

  writeFileSync(gapsPath, JSON.stringify(file, null, 2) + "\n");
  console.log(`\nwrote ${gapsPath}: ${written} row(s), ${keptSitefire} sitefire row(s) preserved`);
  if (engines.length === 1) {
    console.log(
      `note: only one engine (${engines[0]}) — engineDisagreement is false everywhere by ` +
        `construction, not because engines agree.`,
    );
  }
}

main();
