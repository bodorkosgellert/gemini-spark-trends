export type DiscoverCandidate = {
  keyword: string;
  category: string;
  tags: string[];
  score: number;
  desk: string;
  evidenceCount: number;
  topTitle: string | null;
  topUrl: string | null;
  onWatchlist: boolean;
  reason: string;
};
