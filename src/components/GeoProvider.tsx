import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { countryDetails, geoKey, type GeoSelection } from "@/lib/geo.types";
import { GeoSelectionContext, type GeoContextValue } from "@/components/geo-context";

const STORAGE_KEY = "trendspark.geo.v2";
const FALLBACK: GeoSelection = {
  ...countryDetails("DE"),
  city: "Berlin",
  source: "fallback",
};

function fromUrl(): GeoSelection | null {
  const params = new URLSearchParams(window.location.search);
  const countryCode = params.get("country");
  if (!countryCode || !/^[a-z]{2}$/i.test(countryCode)) return null;
  const city = params.get("city")?.trim() || null;
  return { ...countryDetails(countryCode), city, source: "manual" };
}

function fromStorage(): GeoSelection | null {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "null",
    ) as Partial<GeoSelection> | null;
    if (!parsed?.countryCode || !/^[a-z]{2}$/i.test(parsed.countryCode)) return null;
    return {
      ...countryDetails(parsed.countryCode),
      city: parsed.city?.trim() || null,
      source: "manual",
    };
  } catch {
    return null;
  }
}

async function detect(): Promise<GeoSelection> {
  try {
    const response = await fetch("/api/location", { headers: { accept: "application/json" } });
    if (!response.ok) return FALLBACK;
    return (await response.json()) as GeoSelection;
  } catch {
    return FALLBACK;
  }
}

function syncUrl(selection: GeoSelection | null): void {
  const url = new URL(window.location.href);
  if (selection) {
    url.searchParams.set("country", selection.countryCode);
    if (selection.city) url.searchParams.set("city", selection.city);
    else url.searchParams.delete("city");
  } else {
    url.searchParams.delete("country");
    url.searchParams.delete("city");
  }
  window.history.replaceState(window.history.state, "", url);
}

export function GeoProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<GeoSelection>(FALLBACK);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hydrate = async () => {
      // Demo default is Berlin, DE. Auto-detect only runs when the user resets.
      setSelection(fromUrl() ?? fromStorage() ?? FALLBACK);
      setReady(true);
    };
    void hydrate();
  }, []);

  const setManual = useCallback((city: string | null, countryCode: string) => {
    const next: GeoSelection = {
      ...countryDetails(countryCode),
      city: city?.trim() || null,
      source: "manual",
    };
    setSelection(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    syncUrl(next);
  }, []);

  const resetDetection = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY);
    syncUrl(null);
    const next = await detect();
    setSelection(next);
  }, []);

  const value = useMemo<GeoContextValue>(
    () => ({
      selection,
      geoKey: geoKey(selection),
      ready,
      setManual,
      resetDetection,
    }),
    [ready, resetDetection, selection, setManual],
  );

  return <GeoSelectionContext.Provider value={value}>{children}</GeoSelectionContext.Provider>;
}
