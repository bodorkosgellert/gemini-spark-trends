export type GeoSource = "edge-header" | "language" | "manual" | "fallback";
export type MeasurementScope = "city-measured" | "country-proxy" | "global";

export type GeoSelection = {
  countryCode: string;
  countryName: string;
  city: string | null;
  languageCode: string;
  source: GeoSource;
};

export type GeoContext = GeoSelection & {
  geoKey: string;
  locationCode: number | null;
  measurementScope: MeasurementScope;
};

export function geoKey(input: Pick<GeoSelection, "countryCode" | "city">): string {
  const city = input.city
    ?.trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return city ? `${input.countryCode.toUpperCase()}:${city}` : input.countryCode.toUpperCase();
}

export function geoLabel(input: Pick<GeoSelection, "countryCode" | "city">): string {
  return input.city ? `${input.city}, ${input.countryCode.toUpperCase()}` : input.countryCode;
}

export function marketScopeLabel(scope: MeasurementScope): string {
  if (scope === "city-measured") return "city measured";
  if (scope === "country-proxy") return "country proxy";
  return "global";
}

export function calculateMarketDelta(
  localScore: number | null | undefined,
  baselineScore: number | null | undefined,
): number | null {
  if (localScore == null || baselineScore == null) return null;
  return Math.round((localScore - baselineScore) * 10) / 10;
}

export const COUNTRY_OPTIONS = [
  ["DE", "Germany", "de"],
  ["US", "United States", "en"],
  ["GB", "United Kingdom", "en"],
  ["FR", "France", "fr"],
  ["ES", "Spain", "es"],
  ["IT", "Italy", "it"],
  ["NL", "Netherlands", "nl"],
  ["PL", "Poland", "pl"],
  ["CZ", "Czechia", "cs"],
  ["BR", "Brazil", "pt"],
  ["JP", "Japan", "ja"],
] as const;

export function countryDetails(code: string): {
  countryCode: string;
  countryName: string;
  languageCode: string;
} {
  const normalized = code.toUpperCase();
  const match = COUNTRY_OPTIONS.find(([countryCode]) => countryCode === normalized);
  return {
    countryCode: normalized,
    countryName: match?.[1] ?? normalized,
    languageCode: match?.[2] ?? "en",
  };
}
