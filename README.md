# TrendSpark

City-first demand radar for indie / vibe-coders.  
**Tagline:** Building got free. Knowing what to build didn’t.

**Live (Lovable host):** https://gemini-spark-trends.lovable.app  
**Repo:** https://github.com/bodorkosgellert/gemini-spark-trends

## Status (Aug 2026)

Lovable editor credits are exhausted for this week. **Development continues in Cursor** against this GitHub repo. Pushes to `main` still sync back into Lovable when credits return; do not force-push or rewrite published history.

Sister Expo lab (Cobalt UI + local Trends scripts): `trendspark-22c0c6`.

## What this app is

| Route | Purpose |
|-------|---------|
| `/` | Landing — brand + wave hero + product story |
| `/radar` | Live signals from Supabase (demand / supply / opportunity) + inline build briefs |
| `/crosswalk` | Tag ↔ market correlation view |
| `/graph` | Opportunity graph / Δ-style exploration |
| `/store` | App Store–adjacent signal view |

**Ingest:** Wikipedia, GitHub, HN, App Store, Tavily, optional DataForSEO (batched).  
**Briefs:** Anthropic Claude preferred (`ANTHROPIC_API_KEY`); Lovable AI gateway only as fallback.

## Local development

```sh
npm i
cp .env.example .env   # fill keys
npm run dev
```

Required for Radar / briefs:

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- `ANTHROPIC_API_KEY` (SummerUP Claude credits)

Optional enrich:

- `TAVILY_API_KEY` (SummerUP: `SUMMERUPTAVILY`)
- `DATAFORSEO_AUTH` (Basic base64 `login:password`)
- `COGNEE_API_KEY` (archive memory)
- `LOVABLE_API_KEY` (only if you top up Lovable AI again)

Trigger a refresh (needs publishable key as `apikey` header):

```sh
curl -X POST http://localhost:5173/api/public/hooks/ingest \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY" \
  -H "content-type: application/json" \
  -d "{\"limit\": 10}"
```

## Docs

- [docs/PROJECT-SPECS.md](./docs/PROJECT-SPECS.md) — **teammate / product specs (canonical)**
- [docs/CURRENT-STATE.md](./docs/CURRENT-STATE.md) — product snapshot, perks map, pitch priorities  
- [docs/SITEFIRE-CITATION-GAP.md](./docs/SITEFIRE-CITATION-GAP.md) — AI citation gap workflow  
- [AGENTS.md](./AGENTS.md) — notes for Cursor / future agents  

## Pitch wedge

Global Trends → LLM tags/angles is **table stakes**. TrendSpark’s differentiator is **local−global Δ**, city/language filters, and an **accumulating archive** of kept signals — not a one-shot idea dump.
