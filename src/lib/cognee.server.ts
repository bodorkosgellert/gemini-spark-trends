/**
 * Cognee knowledge-graph layer — server only.
 *
 * Supabase stays the source of truth for scores. Cognee is a *projection*:
 * every scored signal plus its evidence rows is written as one document, the
 * graph is built server-side, and questions are answered against the graph
 * rather than against a single row. That is what lets the app answer
 * relationship questions ("which unbuilt market sits next to a rising tag?")
 * that a SQL query over `signals` cannot.
 */

const CONTROL_PLANE = "https://api.aws.cognee.ai";
const DATASET = "trendspark";

let cachedServiceUrl: string | undefined;

function apiKey(): string {
  const key = process.env["COGNEE_API_KEY"];
  if (!key) throw new Error("COGNEE_API_KEY is not configured");
  return key;
}

/** The tenant data-plane host, resolved once per server instance. */
async function serviceUrl(): Promise<string> {
  if (cachedServiceUrl) return cachedServiceUrl;
  const res = await fetch(`${CONTROL_PLANE}/api/v1/tenants/current/service-url`, {
    headers: { "X-Api-Key": apiKey() },
  });
  if (!res.ok) throw new Error(`cognee service-url ${res.status}`);
  const data = (await res.json()) as { service_url?: string };
  if (!data.service_url) throw new Error("cognee returned no service url");
  cachedServiceUrl = data.service_url.replace(/\/$/, "");
  return cachedServiceUrl;
}

async function call<T>(path: string, body: unknown, timeoutMs: number): Promise<T> {
  const base = await serviceUrl();
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "X-Api-Key": apiKey(), "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`cognee ${path} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

export type GraphDocument = {
  keyword: string;
  category: string;
  tags: string[];
  demand: number;
  supply: number;
  opportunity: number;
  momentum: number;
  leadWeeks: number;
  why: string | null;
  evidence: Array<{ source: string; metric: string; value: number | null; detail: string | null }>;
};

/**
 * One document per signal. Written as prose on purpose: Cognee extracts
 * entities and relations from natural language, so "balcony solar competes
 * with…" yields better edges than a JSON blob would.
 */
export function renderDocument(doc: GraphDocument): string {
  const evidence = doc.evidence
    .map((e) => `- ${e.source} ${e.metric}: ${e.value ?? "unavailable"} (${e.detail ?? ""})`)
    .join("\n");
  return [
    `Signal: ${doc.keyword}.`,
    `Category: ${doc.category}. Tags: ${doc.tags.join(", ") || "none"}.`,
    `Demand score ${doc.demand} out of 100. Supply score ${doc.supply} out of 100 (how crowded the build side already is). Opportunity score ${doc.opportunity} out of 100.`,
    `Momentum ${doc.momentum}% against its own trailing baseline. The rise has held for ${doc.leadWeeks} weeks.`,
    doc.why ? `Assessment: ${doc.why}` : "",
    evidence ? `Evidence:\n${evidence}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Push the current signal set into the graph and rebuild it. */
export async function syncGraph(docs: GraphDocument[]): Promise<{ documents: number }> {
  if (docs.length === 0) return { documents: 0 };
  await call(
    "/api/v1/add_text",
    { textData: docs.map(renderDocument), datasetName: DATASET },
    120_000,
  );
  await call("/api/v1/cognify", { datasets: [DATASET], runInBackground: true }, 60_000);
  return { documents: docs.length };
}

export type GraphAnswer = { answer: string; datasetName: string | null };

/** Ask the graph a relationship question. */
export async function askGraph(question: string): Promise<GraphAnswer> {
  const results = await call<
    Array<{ dataset_name?: string; search_result?: unknown[] }>
  >(
    "/api/v1/search",
    { searchType: "GRAPH_COMPLETION", datasets: [DATASET], query: question },
    180_000,
  );

  const first = results?.[0];
  const answer = (first?.search_result ?? [])
    .map((part) => (typeof part === "string" ? part : JSON.stringify(part)))
    .join("\n\n")
    .trim();

  return {
    answer: answer || "The graph returned no answer for that question yet.",
    datasetName: first?.dataset_name ?? null,
  };
}