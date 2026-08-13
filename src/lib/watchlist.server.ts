/**
 * Active watchlist = static WATCHLIST + promoted discoveries.
 * Promotions persist to server/*.local.json (dev) and can be committed via
 * src/data/promoted-watchlist.json when you want them on the live host.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import promotedSeed from "@/data/promoted-watchlist.json";
import { WATCHLIST, type WatchItem } from "@/lib/watchlist";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const localPath = join(root, "server/promoted-watchlist.local.json");
const committedPath = join(root, "src/data/promoted-watchlist.json");

type PromotedFile = {
  updatedAt: string | null;
  items: WatchItem[];
};

function normKey(keyword: string): string {
  return keyword.trim().toLowerCase().replace(/\s+/g, " ");
}

async function readJson(path: string): Promise<WatchItem[]> {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as PromotedFile;
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

function seedItems(): WatchItem[] {
  return Array.isArray((promotedSeed as PromotedFile).items)
    ? (promotedSeed as PromotedFile).items
    : [];
}

export async function listPromotedWatchlist(): Promise<WatchItem[]> {
  const byKey = new Map<string, WatchItem>();
  for (const item of seedItems()) byKey.set(normKey(item.keyword), item);
  for (const item of await readJson(localPath)) byKey.set(normKey(item.keyword), item);
  return [...byKey.values()];
}

/** Static desk + promotions. Used by ingest. */
export async function getActiveWatchlist(): Promise<WatchItem[]> {
  const byKey = new Map<string, WatchItem>();
  for (const item of WATCHLIST) byKey.set(normKey(item.keyword), item);
  for (const item of await listPromotedWatchlist()) {
    if (!byKey.has(normKey(item.keyword))) byKey.set(normKey(item.keyword), item);
  }
  return [...byKey.values()];
}

export async function promoteToWatchlist(item: WatchItem): Promise<{
  ok: true;
  item: WatchItem;
  activeCount: number;
}> {
  const keyword = normKey(item.keyword);
  if (keyword.length < 3 || keyword.length > 80) {
    throw new Error("Keyword must be 3–80 characters.");
  }
  const category = (item.category || "discovered").trim().slice(0, 40) || "discovered";
  const tags = (item.tags?.length ? item.tags : ["discovered"])
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 6);

  const row: WatchItem = { keyword, category, tags };

  const existing = await listPromotedWatchlist();
  const next = [row, ...existing.filter((e) => normKey(e.keyword) !== keyword)].slice(0, 40);
  const payload: PromotedFile = {
    updatedAt: new Date().toISOString(),
    items: next,
  };

  await mkdir(dirname(localPath), { recursive: true });
  await writeFile(localPath, JSON.stringify(payload, null, 2), "utf8");

  // Best-effort: keep committed seed in sync for local demos / git ship.
  try {
    await writeFile(committedPath, JSON.stringify(payload, null, 2), "utf8");
  } catch {
    // read-only hosts ignore this
  }

  const active = await getActiveWatchlist();
  return { ok: true, item: row, activeCount: active.length };
}
