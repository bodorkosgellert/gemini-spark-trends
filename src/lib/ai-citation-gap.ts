import gapsFile from "@/data/ai-citation-gaps.json";

export type AiGapLevel = "high" | "medium" | "low";

/** Shape of the citation set — `gap` alone collapses two states that mean opposite things.
 *  none = AI names no product at all (ambiguous: whitespace, or a category that does not exist commercially)
 *  fragmented = several brands, none repeating across engines (strongest signal: demand exists, no winner)
 *  dominated = 1-2 brands cited consistently (category is settled) */
export type CitationShape = "none" | "fragmented" | "dominated";

/** What the AI answers *with* when it has no product to name. */
export type AnswerType = "product" | "directory" | "advice" | "hardware";

export type AiCitationGap = {
  slug: string;
  keyword: string;
  gap: AiGapLevel;
  /** demo = placeholder, never a finding. sitefire = third-party measurement.
   *  anthropic = our own search-grounded sweep (scripts/geo-sweep.ts) — real, but
   *  self-collected, so it carries less weight than sitefire externally. */
  status: "demo" | "sitefire" | "anthropic";
  prompt: string;
  cited: string[];
  localCited: boolean;
  note: string;
  /** Fields below are optional so Sitefire rows can be merged in progressively. */
  citationShape?: CitationShape;
  answerType?: AnswerType;
  engines?: string[];
  engineDisagreement?: boolean;
};

const gaps = (gapsFile as { gaps: AiCitationGap[] }).gaps;

const bySlug = new Map(gaps.map((g) => [g.slug, g]));
const byKeyword = new Map(gaps.map((g) => [g.keyword.toLowerCase(), g]));

export function getAiCitationGap(slug: string, keyword?: string): AiCitationGap | null {
  return (
    bySlug.get(slug) ?? (keyword ? (byKeyword.get(keyword.toLowerCase()) ?? null) : null) ?? null
  );
}

export function listAiCitationGaps(): AiCitationGap[] {
  return gaps;
}

export function gapLabel(gap: AiGapLevel): string {
  if (gap === "high") return "AI gap high";
  if (gap === "medium") return "AI gap mid";
  return "AI gap low";
}

export function gapExplanation(gap: AiGapLevel): string {
  if (gap === "high") {
    return "AI answers rarely agree on or cite a clear product for this tracked question.";
  }
  if (gap === "medium") {
    return "AI answers show some product coverage, but the recommendation landscape is still unsettled.";
  }
  return "AI answers already cite a fairly clear product set. This is weak whitespace evidence.";
}

export function shapeLabel(shape: CitationShape): string {
  if (shape === "none") return "no product cited";
  if (shape === "fragmented") return "no clear winner";
  return "winner cited";
}

export function shapeExplanation(shape: CitationShape): string {
  if (shape === "none") {
    return "No product was named. This may be whitespace, or simply a category with little proven demand.";
  }
  if (shape === "fragmented") {
    return "Several products were named, but none repeats reliably across engines. This is the strongest AI-gap signal.";
  }
  return "One or two products are cited consistently, so the AI answer landscape is comparatively settled.";
}

export const LOCAL_CITE_EXPLANATION =
  "No country-specific product or source was cited for the tracked market.";

export const ENGINE_DISAGREEMENT_EXPLANATION =
  "Different AI engines named different winners, or one named none. The answer is unstable.";

export const AI_GAP_FILTER_EXPLANATION =
  "Show measured high or medium AI citation gaps. A gap is validation evidence, not proof of demand or revenue.";

/** Why a gap is interesting depends on how crowded the shelf already is.
 *  Absent AI citations do NOT mean absent competitors — a category can have 50 App Store
 *  apps and still be invisible to AI, which is a distribution gap, not a supply gap. */
export type GapStory = "whitespace" | "geo-arbitrage" | "crowded";

export function gapStory(gap: AiGapLevel, supplyScore: number): GapStory | null {
  if (gap === "low") return null;
  return supplyScore >= 40 ? "geo-arbitrage" : "whitespace";
}

export function gapStoryLabel(story: GapStory): string {
  if (story === "whitespace") return "whitespace · nobody built it";
  if (story === "geo-arbitrage") return "geo arbitrage · built, invisible to AI";
  return "crowded";
}

export function gapStoryExplanation(story: GapStory): string {
  if (story === "whitespace") {
    return "AI coverage and measured software supply are both thin. Validate demand before treating this as an opportunity.";
  }
  if (story === "geo-arbitrage") {
    return "Products exist, but AI rarely cites them. Demand is more credible; discoverability and localization may be the gap.";
  }
  return "Supply is established and AI recommendations are comparatively settled.";
}

function citeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function looksLikeDomain(value: string): boolean {
  return (
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(\/.*)?$/i.test(value) &&
    !/\s/.test(value)
  );
}

/** Official product homepages for named cites. Unknown strings stay unresolved. */
const KNOWN_CITED_HOMEPAGES: Record<string, string> = {
  anker: "https://www.anker.com",
  "aroundhome": "https://www.aroundhome.de",
  "avery dennison": "https://www.averydennison.com",
  belegagent: "https://belegagent.de",
  belegepilot: "https://www.belegepilot.de",
  "bland ai": "https://www.bland.ai",
  buchhaltungsbutler: "https://www.buchhaltungsbutler.de",
  checkfox: "https://www.checkfox.de",
  circularise: "https://www.circularise.com",
  circulor: "https://www.circulor.com",
  cloudflare: "https://workers.cloudflare.com",
  "cloudflare workers": "https://workers.cloudflare.com",
  cognigy: "https://www.cognigy.com",
  composio: "https://composio.dev",
  "credo ai": "https://www.credo.ai",
  crossmint: "https://www.crossmint.com",
  datev: "https://www.datev.de",
  "datev unternehmen online": "https://www.datev.de",
  deye: "https://www.deyeinverter.com",
  "deye solar go": "https://www.deyeinverter.com",
  "docker mcp gateway": "https://docs.docker.com/ai/mcp-catalog-and-toolkit/",
  docmedico: "https://www.docmedico.de",
  drata: "https://www.drata.com",
  easybill: "https://www.easybill.de",
  ecoflow: "https://www.ecoflow.com",
  enpal: "https://www.enpal.de",
  enwendo: "https://www.enwendo.de",
  fastbill: "https://www.fastbill.com",
  "fronius": "https://www.solarweb.com",
  genrocket: "https://www.genrocket.com",
  glama: "https://glama.ai",
  growatt: "https://www.growatt.com",
  "growatt shinephone": "https://www.growatt.com",
  gretel: "https://gretel.ai",
  hazy: "https://hazy.com",
  heizungsfinder: "https://www.heizungsfinder.de",
  "holistic ai": "https://www.holisticai.com",
  ipoint: "https://www.ipoint-systems.com",
  "ipoint systems": "https://www.ipoint-systems.com",
  justcall: "https://justcall.io",
  k2view: "https://www.k2view.com",
  lexoffice: "https://www.lexoffice.de",
  "lexware office": "https://www.lexoffice.de",
  lexware: "https://www.lexware.de",
  mastercard: "https://www.mastercard.com",
  medflex: "https://www.medflex.de",
  mintmcp: "https://www.mintmcp.com",
  modulos: "https://www.modulos.ai",
  "mostly ai": "https://mostly.ai",
  onetrust: "https://www.onetrust.com",
  openai: "https://openai.com",
  "openai chatgpt instant checkout": "https://openai.com",
  ordicall: "https://www.ordicall.de",
  osapiens: "https://www.osapiens.com",
  parloa: "https://www.parloa.com",
  paypal: "https://www.paypal.com",
  "placetel ai": "https://www.placetel.de",
  polyai: "https://poly.ai",
  "portkey mcp gateway": "https://portkey.ai",
  portkey: "https://portkey.ai",
  praxisconcierge: "https://www.praxisconcierge.de",
  "retell ai": "https://www.retellai.com",
  saidot: "https://www.saidot.ai",
  sevdesk: "https://sevdesk.de",
  siemens: "https://www.siemens.com",
  sma: "https://www.sunnyportal.com",
  smithery: "https://smithery.ai",
  solakon: "https://solakon.de",
  solarman: "https://www.solarmanpv.com",
  "solar web": "https://www.solarweb.com",
  spherity: "https://www.spherity.com",
  stripe: "https://stripe.com",
  "sunny portal": "https://www.sunnyportal.com",
  synthflow: "https://synthflow.ai",
  synthea: "https://synthetichealth.github.io/synthea/",
  syntho: "https://www.syntho.ai",
  thermondo: "https://www.thermondo.de",
  tonic: "https://www.tonic.ai",
  trail: "https://www.trail-ml.com",
  truefoundry: "https://www.truefoundry.com",
  "t systems": "https://www.t-systems.com",
  vanta: "https://www.vanta.com",
  verivox: "https://www.verivox.de",
  visa: "https://www.visa.com",
  vitas: "https://www.telefonassistent.de",
  "wiso meinburo": "https://www.buhl.de",
  "321 med": "https://www.321med.de",
  aircall: "https://aircall.io",
  zeeg: "https://zeeg.me",
};

function homepageFor(value: string): string | null {
  const key = citeKey(value);
  if (!key) return null;
  if (KNOWN_CITED_HOMEPAGES[key]) return KNOWN_CITED_HOMEPAGES[key]!;
  const firstWord = key.split(" ")[0] ?? "";
  return firstWord && KNOWN_CITED_HOMEPAGES[firstWord] ? KNOWN_CITED_HOMEPAGES[firstWord]! : null;
}

/**
 * Resolve a cited brand/domain to a URL when we have one.
 * Vague demo strings ("generic energy blogs", "US voice-agent SaaS") return null —
 * do not Google-guess a homepage on the Radar.
 */
export function resolveCitedUrl(cited: string): string | null {
  const raw = cited.trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) return raw;
  if (looksLikeDomain(raw)) return `https://${raw.replace(/^www\./i, "")}`;

  const parenthetical = raw.match(/\(([^)]+)\)/);
  if (parenthetical?.[1]) {
    const inner = parenthetical[1].trim();
    if (/^https?:\/\//i.test(inner)) return inner;
    if (looksLikeDomain(inner)) return `https://${inner.replace(/^www\./i, "")}`;
    const fromInner = homepageFor(inner);
    if (fromInner) return fromInner;
  }

  return homepageFor(raw.replace(/\s*\([^)]*\)\s*/g, " "));
}

export const CITED_FINAL_VERSION_HINT =
  "No live homepage on file for this name yet. We only link a cited brand when the domain is known — we do not Google-guess it.";
