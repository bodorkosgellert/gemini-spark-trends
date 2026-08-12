# CLAUDE.md

Read [AGENTS.md](./AGENTS.md) first — stack facts, Lovable constraints, and product rules live
there and apply here unchanged. This file adds Claude-specific operating rules.

## Session start

Context does not carry between sessions. Before answering anything about GEO, Sitefire, the
graph, or scoring, read:

- `docs/CURRENT-STATE.md` — what works, what's left for Pitch Day
- `docs/CLAUDE-SITEFIRE-GEO.md` — the Sitefire runbook and repo map
- `docs/GRAPH-APPROACH-C.md` — dated Cognee datasets + `signal_edges`
- `docs/SITEFIRE-PROMPT-SET.md` — the 60 tracked prompts and the recording schema

Gellert briefs these from Cursor specifically so a fresh session can pick up the thread. Much
of the work is **uncommitted** — read the working tree, not just `git log`.

## Sitefire MCP

Configured at user scope: `https://app.sitefire.ai/api/mcp` (HTTP, browser sign-in, no key).
MCP servers load at session start, so one added mid-session needs a restart before its tools
appear; `/mcp` completes auth.

```text
Use Sitefire MCP for tracked topics, citations, and visibility only.
Prefer show/list/get. Ask before creating actions or articles — writes burn trial quota.
```

Sitefire has **no public citations REST API**. MCP or the web UI are the only read paths.

Measured facts (2026-08-12), which override the older estimates in `CLAUDE-SITEFIRE-GEO.md`:

- **Lite/trial caps active prompts at 20**, not ~150; all 20 were spent on sign-up on
  auto-generated topics about TrendSpark's *own* category. **Pro trial (from 2026-08-12) lifts
  it** — 36 niche prompts went in on top. **Cancel Pro by 2026-08-17.**
- Freeing slots is a **web-UI job** — MCP is read + add + create only, with no deactivate,
  delete, or update tool.
- `add_topics` generates prompt wording itself; there is no prompt-text parameter, and no
  `list_prompts` tool exists, so wording can only be reviewed in the web UI. Topic, country,
  language, and count are settable. Prompts are **not** deduplicated across calls.
- 12 niche topics × 3 prompts are live — see `docs/SITEFIRE-PROMPT-SET.md` for the table and
  which two are calibration controls.
- `list_topics` returns `search_volume: null` while `get_topic_positions` reports exactly
  `1000` for every topic. That 1000 is a placeholder — never quote it as demand.

## AI citation gap

`src/data/ai-citation-gaps.json` → `src/lib/ai-citation-gap.ts` → Radar badges + `ai-gap` filter.

- Rows with `"status": "demo"` are **placeholders**. Never present them as findings.
- `citationShape` matters more than `gap`: `none` (nothing cited — ambiguous, check demand)
  vs `fragmented` (several brands, no winner — **strongest signal**) vs `dominated` (settled).
- `engineDisagreement: true` means engines named different winners, or one named none. An
  unstable AI answer is itself an opening; Radar surfaces it as its own chip.
- Absent AI citations ≠ absent competitors. Read the story off supply (`gapStory()`):
  low supply + gap = **whitespace**; high supply + gap = **geo arbitrage** (built, but
  invisible to AI — demand already proven, incumbents haven't done GEO).
- An AI gap is not proven revenue, and Sitefire's own case-study numbers are not TrendSpark's.

## Scoring

`score()` in `src/lib/ingest.server.ts` sets `supply = max(githubCrowding, appStoreDensity)`.
This is Outcome-Driven Innovation with proxies: `demand` ≈ importance, `supply` ≈ satisfaction.

Store occupancy is discounted by `shelfSatisfaction()` (`itunes.server.ts`), because a full
shelf only counts as *served* demand if the shelf works:

```
storeSupply = occupancy × (0.5 + 0.5 × satisfaction)      // null satisfaction = no discount
satisfaction = 0.4 × quality + 0.6 × adoption             // 0..1
```

Adoption outweighs stars deliberately. Measured across watchlist niches, App Store ratings sit
at 4.3–4.8★ regardless of niche, so quality saturates and separates nothing; **review volume**
separates cleanly. The common real case is a shelf nobody uses, not a badly-rated one — e.g.
`heat pump installer` returns 18 apps averaging 4.3★ across 22 total ratings.

The 0.5 floor is deliberate: weak incumbents still occupy attention, so this is a haircut, not
an erasure. `shelf_satisfaction` is emitted as its own evidence reading so the discount is
auditable rather than buried in one number.

Keyword volume measures curiosity, not hiring intent — don't let raw demand drive ranking alone.

## Briefs

Cached per signal in `signal_briefs` and reused (`briefs.pipeline.server.ts`), so a given
signal returns a stable artifact. Keep it that way for anything sold: if two buyers get
different answers for the same signal, the signal isn't defensible. Vary *presentation* in
outreach if you want to test framing — never the underlying scores.

## Secrets

- Never paste credentials into chat. Transcripts are stored in plaintext on disk.
- Ingest hook prefers `INGEST_HOOK_SECRET`, falling back to `SUPABASE_PUBLISHABLE_KEY`. The
  fallback is a weak gate — anyone with a leaked publishable key can burn DataForSEO and
  Anthropic credits. Set the dedicated secret.
