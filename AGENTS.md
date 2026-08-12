<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# TrendSpark agent notes

## Active workspace

- **Primary product (web):** this repo (`gemini-spark-trends`) — TanStack Start + Supabase.
- **Secondary lab (Expo):** `../trendspark-22c0c6` — Cobalt UI experiments + DFS/Tavily scripts.
- **Do not** invent Δ percentages with an LLM. Scores and Δ come from ingest / Trends math.

## Lovable credits out

- Prefer editing here in Cursor; `npm run dev` locally.
- Briefs use **`ANTHROPIC_API_KEY` first**, then `LOVABLE_API_KEY` fallback (`src/lib/briefs.server.ts`).
- Never commit `.env` or paste live secrets into chat/docs.

## Stack facts

- Frontend: TanStack Router/Start, Vite, Tailwind v4, Inter Tight / JetBrains Mono.
- Data: Supabase `signals`, `signal_evidence`, `signal_briefs`, `ingest_runs`.
- Ingest hook: `POST /api/public/hooks/ingest` with `apikey: INGEST_HOOK_SECRET` (falls back to `SUPABASE_PUBLISHABLE_KEY`).
- Watchlist: `src/lib/watchlist.ts`.

## SummerUP perks to prefer

| Perk | Use |
|------|-----|
| Anthropic $100 | Briefs + ruthless Trends filter |
| Tavily 8k (`SUMMERUPTAVILY`) | News context / event blacklist |
| n8n Cloud Pro | Daily ingest cron after Pitch Day |
| cognee $100 | Archive memory of kept tags |
| Sliplane €250 | Host if Lovable host is limiting. Perks page shows exhausted; Gellért holds a printed code from the desk (2026-08-12) — redeem it, don't rely on the page. |
| DataForSEO (paid/trial) | Absolute volume + city Δ, not free Trends scrape |
| Sitefire 7d | Manual AI citation gap → `src/data/ai-citation-gaps.json` ([docs](./docs/SITEFIRE-CITATION-GAP.md)) |

Avoid depending on **pytrends** for demos (ToS + breakage). Free Trends RSS is OK for ~10 daily items/geo.

## Product rules

1. Humans: free / pay-after. Agents x402 = spec until live.
2. App angle = spark; **Δ + city + tag archive** = product.
3. Ruthless LLM pass drops news/sports/geopolitics; keep durable admin/health/finance/local friction.
