# Ulwick / ODI — notes for TrendSpark

Source: [Outcome-Driven Innovation](https://anthonyulwick.com/outcome-driven-innovation/)

Ulwick: start from the **job** and **desired outcomes**, then find unmet needs (importance high, satisfaction low).

| Ulwick       | TrendSpark today                                                              |
| ------------ | ----------------------------------------------------------------------------- |
| Importance   | Demand (Trends / conversation)                                                |
| Satisfaction | Supply — now **GitHub + App Store occupancy × ratings** (`shelfSatisfaction`) |
| Opportunity  | `demand × (1 − supply/130)`                                                   |

**New / useful from ODI + Claude’s take (already partly coded):**

1. Satisfaction-weighted shelf (many bad apps ≠ served) — in ingest.
2. Sitefire prompts as job statements with a **without** clause (pain/constraint).
3. Don’t treat raw keyword volume as buying intent alone.

**Not for Pitch Day:** full ODI survey questionnaires / Strategyn process.

## Check results in a browser

```sh
cd gemini-spark-trends   # or trendspark-web clone
npm run export:demo
start server/demo-graph.html    # Windows
```

Also: `npm run dev` → Radar (`/radar`), Connections (`/graph`) (live scores need re-ingest after deploy).
