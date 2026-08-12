Full Claude/Cursor MCP runbook: [CLAUDE-SITEFIRE-GEO.md](./CLAUDE-SITEFIRE-GEO.md).

# Sitefire → AI citation gap (TrendSpark)

Sitefire has **no public data API** for citations (only a book-demo API). Integration for SummerUP is:

**Sitefire UI (or Spark MCP) → fill `src/data/ai-citation-gaps.json` → Radar shows gap badges.**

## 1. Set up Sitefire (5 min)

1. Redeem the SummerUP 7-day trial at [sitefire.ai](https://sitefire.ai) → [app.sitefire.ai](https://app.sitefire.ai).
2. **Do not** only add `trendspark` as the brand. For **citation gap on niches**, pick **competitor / category domains** (or a stand-in domain in that niche), e.g.:
   - balcony solar → a big DE solar marketplace or info site
   - e-invoicing Germany → DATEV / sevDesk / Lexoffice-class sites
   - AI receptionist → a US voice-agent brand
3. Let Sitefire generate **prompts** (buyer questions). Edit them to match TrendSpark keepers (local language OK).
4. Run **Analyze**. Note for each prompt:
   - Are clear products/brands cited?
   - Any **local DE / Berlin** tool cited?
   - Top cited domains

Optional MCP (Claude Desktop / Cursor if you add the connector):

```txt
https://app.sitefire.ai/api/mcp
```

Ask: *“For my tracked topics, which prompts have low brand visibility / no clear product winner?”*

## 2. Score the gap (simple rubric)

| Gap | Meaning |
|-----|---------|
| `high` | AI answers the topic with generic advice or global brands only — **no clear local/niche product** |
| `medium` | 1–2 weak citations; category still open |
| `low` | Crowded — strong cited winners already |

Pair with Radar **demand**: high demand + high AI gap = best LOI story.

## 3. Write into the repo

Edit [`src/data/ai-citation-gaps.json`](../src/data/ai-citation-gaps.json). Match `slug` to Radar signal slugs (`keyword` lowercased, spaces → `-`).

Then refresh `/radar` — badges and the **ai-gap** filter appear automatically. No Supabase migration required.

## 4. What we did *not* build

- Live pull from Sitefire on every page load (no API key product surface for that).
- Borrowing Sitefire’s +300% case-study numbers for the TrendSpark pitch.
