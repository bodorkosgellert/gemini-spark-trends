# TrendSpark — current state (2026-08-11)

## Verdict

The Lovable web app already demonstrates the core loop: **signals in Supabase → Radar UI → LLM build briefs**. Global Trends + Tavily + ruthless filter → tags/app angles works (see SummerUP demo table: 162 → 25 keepers). Cursor now owns further edits because Lovable credits are spent.

## Surfaces

| Surface                         | Look / role                                                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Landing `/`                     | White paper + **blue wave** backdrop (`BlueWaves`), Inter Tight display, mono CTAs, sample Berlin/Tokyo/Lisbon cards |
| Radar `/radar`                  | Live scored list, tag filters, sparklines, heat colors, “write brief” inline                                         |
| Crosswalk / Connections / Store | Correlation + opportunity exploration; connection map usable without every paid key                                  |

Visual language today: cool light UI, primary blue accent, mono uppercase nav — not the Expo Cobalt paper pass (that lives in `trendspark-22c0c6`).

## Engine

1. **Watchlist** keywords → ingest (Trends scrape + Wiki + GH + HN + Tavily + optional DFS batch).
2. Fold into demand / supply / opportunity / momentum / series.
3. Upsert `signals` + `signal_evidence`.
4. Brief on demand via **Anthropic** (preferred) or Lovable AI gateway.

## What still needs work for Pitch Day (~Aug 14)

1. Put `ANTHROPIC_API_KEY` (+ Tavily / DFS if missing) in local `.env` and confirm briefs work offline Lovable.
2. Seed or re-ingest a **Berlin +Δ** and a **global −Δ** pair for the live demo path.
3. Optional: surface “kept archive” / tag counts from the ruthless filter run (finance, health, admin, …).
4. **Sitefire AI gap:** redeem trial → fill `src/data/ai-citation-gaps.json` (see `docs/SITEFIRE-CITATION-GAP.md`); Radar already shows badges + `ai-gap` filter.
5. Deploy path if Lovable host drifts: Sliplane or `npm run build` + static/SSR host.
6. Do **not** block on pytrends, worldmonitor clone, or Failory scrape.

## Archive thesis

Each kept query should accumulate as structured rows (geo, lang, tags, keep reason, date, optional Δ). Over weeks that becomes the moat; a one-shot LLM idea table is not.

## Sister repo

`trendspark-22c0c6` has Cobalt design tokens, `npm run fetch:trends-dfs`, `enrich:watchlist`, and discovery scripts — useful for Δ math before wiring into this Supabase `signals` table.
