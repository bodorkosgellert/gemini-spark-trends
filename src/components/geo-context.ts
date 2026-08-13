import { createContext, useContext } from "react";

import type { GeoSelection } from "@/lib/geo.types";

export type GeoContextValue = {
  selection: GeoSelection;
  geoKey: string;
  ready: boolean;
  setManual: (city: string | null, countryCode: string) => void;
  resetDetection: () => Promise<void>;
};

export const GeoSelectionContext = createContext<GeoContextValue | null>(null);

export function useGeo(): GeoContextValue {
  const value = useContext(GeoSelectionContext);
  if (!value) throw new Error("useGeo must be used inside GeoProvider");
  return value;
}
