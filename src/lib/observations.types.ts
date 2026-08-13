import type { GeoSelection } from "./geo.types";

export type EvidenceType =
  | "complaint"
  | "workaround"
  | "fragmentation"
  | "coordination"
  | "new-capability"
  | "new-constraint"
  | "manual-workflow"
  | "discovery"
  | "other";

export type OpportunityFamily =
  | "discovery"
  | "monitoring"
  | "automation"
  | "coordination"
  | "aggregation"
  | "prediction"
  | "tracking"
  | "comparison"
  | "translation"
  | "visualization"
  | "marketplace"
  | "creator"
  | "utility";

export type SignalObservation = {
  id?: string;
  canonicalQuery: string;
  source: string;
  sourceType: string;
  evidenceUrl: string | null;
  evidenceText: string;
  observedBehavior: string;
  evidenceType: EvidenceType;
  friction: string | null;
  workaround: string | null;
  provenance: "measured" | "derived";
  evidenceHash: string;
  observedAt: string | null;
  geo: GeoSelection;
};

export type AppSeed = {
  id?: string;
  family: OpportunityFamily;
  title: string;
  userType: string;
  problem: string;
  concept: string;
  variations: string[];
  whyInteresting: string;
  interestingScore: number;
  commercialScore: number;
  buildabilityScore: number;
  validationStep: string;
  provenance: "derived";
  model: string;
  modelVersion: string;
  sourceHash: string;
};

export type OpportunitySpace = {
  observation: SignalObservation;
  appSeeds: AppSeed[];
};

export type ObservationDiscoveryResult = {
  spaces: OpportunitySpace[];
  generatedAt: string;
  geo: GeoSelection;
  note: string;
};

export function provenanceLabel(provenance: "measured" | "derived"): string {
  return provenance === "measured" ? "source evidence · measured" : "interpretation · derived";
}
