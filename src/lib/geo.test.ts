import { describe, expect, it } from "vitest";

import { countryLocationCode, resolveGeo } from "./geo.server";
import { calculateMarketDelta, countryDetails, geoKey, marketScopeLabel } from "./geo.types";

describe("geo foundation", () => {
  it("creates stable country and city keys", () => {
    expect(geoKey({ countryCode: "de", city: "München" })).toBe("DE:munchen");
    expect(geoKey({ countryCode: "BR", city: null })).toBe("BR");
  });

  it("falls back to a country proxy without inventing a city score", async () => {
    const resolved = await resolveGeo({
      ...countryDetails("DE"),
      city: null,
      source: "fallback",
    });
    expect(resolved.locationCode).toBe(countryLocationCode("DE"));
    expect(resolved.measurementScope).toBe("country-proxy");
  });

  it("only calculates deltas when both snapshots exist", () => {
    expect(calculateMarketDelta(72.2, 61.1)).toBe(11.1);
    expect(calculateMarketDelta(72, null)).toBeNull();
  });

  it("uses honest measurement labels", () => {
    expect(marketScopeLabel("city-measured")).toBe("city measured");
    expect(marketScopeLabel("country-proxy")).toBe("country proxy");
    expect(marketScopeLabel("global")).toBe("global");
  });
});
