export type SearchVelocity = "high" | "medium" | "low";
export type LocalCompetition = "none" | "weak" | "fragmented" | "dominated";

export type GlobalArbitrageIdea = {
  id: string;
  coreConcept: string;
  validatedMarket: {
    countryCode: string;
    searchVelocity: SearchVelocity;
    dominantPlayer: string;
  };
  targetMarketOpportunity: {
    countryCode: string;
    /** 0–100 interest / coverage proxy (seed or live scan). */
    localSearchVolume: number;
    localCompetition: LocalCompetition;
    localizationMoat: string;
  };
  tags: string[];
  /** 0–10 capitalization score for vibe-coders. */
  capitalizationScore: number;
  /** seeded | live | measured — whether numbers came from seeds, search coverage or snapshots */
  source: "seed" | "live" | "measured";
  note?: string;
};

export type ArbitrageScanResult = {
  ideas: GlobalArbitrageIdea[];
  generatedAt: string;
  note: string;
};
