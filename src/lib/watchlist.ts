/** The keywords the engine tracks. Client-safe: the radar uses it for tag chips. */
export type WatchItem = { keyword: string; category: string; tags: string[] };

export const WATCHLIST: WatchItem[] = [
  { keyword: "ai agents", category: "ai-tools", tags: ["agents", "automation", "b2b"] },
  { keyword: "mcp server", category: "ai-tools", tags: ["agents", "developer", "protocol"] },
  { keyword: "voice ai agent", category: "ai-tools", tags: ["voice", "agents", "smb"] },
  { keyword: "ai receptionist", category: "smb", tags: ["voice", "smb", "services"] },
  { keyword: "vibe coding", category: "developer", tags: ["developer", "no-code"] },
  { keyword: "local first software", category: "developer", tags: ["developer", "privacy"] },
  { keyword: "rag pipeline", category: "ai-tools", tags: ["developer", "search"] },
  { keyword: "ai video editing", category: "creative", tags: ["video", "creator"] },
  { keyword: "synthetic data", category: "ai-tools", tags: ["data", "privacy", "b2b"] },
  { keyword: "eu ai act compliance", category: "regulation", tags: ["compliance", "eu", "b2b"] },
  { keyword: "digital product passport", category: "regulation", tags: ["compliance", "eu", "supply-chain"] },
  { keyword: "heat pump installer", category: "energy", tags: ["local", "services", "climate"] },
  { keyword: "balcony solar", category: "energy", tags: ["local", "climate", "hardware"] },
  { keyword: "repair cafe", category: "local", tags: ["local", "community", "climate"] },
  { keyword: "e invoicing germany", category: "regulation", tags: ["compliance", "eu", "smb"] },
  { keyword: "agentic commerce", category: "commerce", tags: ["agents", "payments", "commerce"] },
  { keyword: "x402 payments", category: "commerce", tags: ["agents", "payments", "crypto"] },
  { keyword: "ai for bookkeeping", category: "smb", tags: ["smb", "finance", "automation"] },
];

export const ALL_TAGS = Array.from(new Set(WATCHLIST.flatMap((w) => w.tags))).sort();