import { countryDetails, geoKey, type GeoContext, type GeoSelection } from "./geo.types";

const COUNTRY_LOCATION_CODE: Record<string, number> = {
  DE: 2276,
  US: 2840,
  GB: 2826,
  FR: 2250,
  ES: 2724,
  IT: 2380,
  NL: 2528,
  PL: 2616,
  CZ: 2203,
  BR: 2076,
  JP: 2392,
};

type DataForSeoLocation = {
  location_code?: number;
  location_name?: string;
  country_iso_code?: string;
  location_type?: string;
};

const locationCache = new Map<
  string,
  { locationCode: number | null; measurementScope: GeoContext["measurementScope"] }
>();
let locationsPromise: Promise<DataForSeoLocation[]> | null = null;

async function loadDataForSeoLocations(): Promise<DataForSeoLocation[]> {
  const auth = process.env["DATAFORSEO_AUTH"];
  if (!auth) return [];
  if (!locationsPromise) {
    locationsPromise = fetch("https://api.dataforseo.com/v3/keywords_data/google_ads/locations", {
      headers: { authorization: `Basic ${auth}`, accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) return [];
        const payload = (await response.json()) as {
          tasks?: Array<{ result?: DataForSeoLocation[] }>;
        };
        return payload.tasks?.[0]?.result ?? [];
      })
      .catch(() => []);
  }
  return locationsPromise;
}

export async function resolveGeo(selection: GeoSelection): Promise<GeoContext> {
  const normalized = {
    ...countryDetails(selection.countryCode),
    city: selection.city?.trim() || null,
    source: selection.source,
  };
  const key = geoKey(normalized);
  if (locationCache.has(key)) {
    const cached = locationCache.get(key)!;
    return {
      ...normalized,
      geoKey: key,
      ...cached,
    };
  }

  let locationCode: number | null = null;
  let cityMatched = false;
  if (normalized.city) {
    const locations = await loadDataForSeoLocations();
    const city = normalized.city.toLocaleLowerCase("en");
    const exact = locations.find(
      (location) =>
        location.country_iso_code?.toUpperCase() === normalized.countryCode &&
        location.location_name?.toLocaleLowerCase("en") === city &&
        /city/i.test(location.location_type ?? ""),
    );
    locationCode = exact?.location_code ?? null;
    cityMatched = Boolean(exact?.location_code);
  }
  locationCode ??= COUNTRY_LOCATION_CODE[normalized.countryCode] ?? null;
  const measurementScope = cityMatched
    ? "city-measured"
    : locationCode
      ? "country-proxy"
      : "global";
  locationCache.set(key, { locationCode, measurementScope });
  return {
    ...normalized,
    geoKey: key,
    locationCode,
    measurementScope,
  };
}

export function countryLocationCode(countryCode: string): number | null {
  return COUNTRY_LOCATION_CODE[countryCode.toUpperCase()] ?? null;
}
