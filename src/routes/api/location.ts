import { createFileRoute } from "@tanstack/react-router";

import { countryDetails, type GeoSelection } from "@/lib/geo.types";

function decodeHeader(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value).trim() || null;
  } catch {
    return value.trim() || null;
  }
}

function locationFromRequest(request: Request): GeoSelection {
  const countryHeader =
    request.headers.get("cf-ipcountry") ??
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("x-country-code");
  const city =
    decodeHeader(request.headers.get("cf-ipcity")) ??
    decodeHeader(request.headers.get("x-vercel-ip-city"));

  if (countryHeader && /^[a-z]{2}$/i.test(countryHeader)) {
    return {
      ...countryDetails(countryHeader),
      city,
      source: "edge-header",
    };
  }

  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const localeCountry = acceptLanguage.match(/\b[a-z]{2}-([A-Z]{2})\b/)?.[1];
  if (localeCountry) {
    return {
      ...countryDetails(localeCountry),
      city: null,
      source: "language",
    };
  }

  return {
    ...countryDetails("DE"),
    city: "Berlin",
    source: "fallback",
  };
}

export const Route = createFileRoute("/api/location")({
  server: {
    handlers: {
      GET: ({ request }) =>
        Response.json(locationFromRequest(request), {
          headers: { "cache-control": "private, max-age=3600" },
        }),
    },
  },
});
