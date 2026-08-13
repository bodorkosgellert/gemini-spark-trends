# TrendSpark — current state (2026-08-13)

## Verdict

**Local + GitHub `main` (`9a1685a`) is the Pitch Day build.** Lovable host [trendspark2026.lovable.app](https://trendspark2026.lovable.app) syncs from that commit. Hard-refresh after deploy (Ctrl+Shift+R).

City-first loop: **location → observations → Radar scores → brief**. Scores and Δ still come from ingest, never from an LLM.

## Surfaces

| Route | Label | Role |
| ----- | ----- | ---- |
| `/` | Home | Brand + product story |
| `/radar` | Radar | Scored signals, AI-gap overlay, cited-brand links, local vs global interest after ingest |
| `/discover` | Discover | Human-friction observations → app seeds (no invented keywords) |
| `/arbitrage` | Market Gaps | Proven-elsewhere vs open-here (seed + optional live scan) |
| `/graph` | Connections | Signal → observation → friction → seed |
| `/store` | Store | App Store shelf occupancy |
| `/crosswalk` | Crosswalk | Tag / market correlation |
| `/suggest` | Suggest | Public idea inbox |

Default market: **Berlin, DE** (country-proxy unless DataForSEO resolves the city).

## Engine

1. Watchlist (+ Discover promotions) → ingest (Wiki, GitHub, HN, App Store, Tavily, optional DataForSEO, Google Trends country + worldwide).
2. Demand / supply / opportunity; supply uses GitHub crowding and App Store occupancy × satisfaction.
3. `signals` + `signal_evidence` + `signal_market_snapshots` (city/country + `GLOBAL` series).
4. Briefs via **Anthropic** first, Lovable AI only as fallback. Cached per signal.

## Sales / outreach (different approaches)

All copy lives in `docs/outreach/` and `docs/EMAIL-OUTREACH.md`. Do not invent regional scores.

| Approach | Where | Use |
| -------- | ----- | --- |
| Interest-first email (no price) | `EMAIL-OUTREACH.md`, `SHORT-TEMPLATE.md` | US/UK/IE/NL/FR/AU — finding + live link, ask “interested” |
| Personalized Wave A (~20) | `outreach/personalized/` | Named app + seller + dated shelf line |
| Semi-templated Wave B | `outreach/semi/` (heat pump, balcony solar, invoice, habit, RAG) | Same finding, swap name/app |
| LinkedIn hand notes | EMAIL-OUTREACH channel table | DE/AT/CH/IT/ES/PL — no cold email |
| In person | Pitch Day / Berlin | Highest conversion |
| Market Gaps board | `/arbitrage` | Import play: proven in A, thin in B |
| AI citation gap | Radar `ai-gap` + Sitefire notes | Built but invisible to AI |

First email: **no €39 / payment link.** Dossier price only after they reply interested.

## Pitch Day checklist

1. Lovable Cloud env = same Supabase as `.env` (`yzdhyhyqxbrybjwkrlow`).
2. Bounded Berlin ingest so Radar shows local vs global curves (snapshots + `GLOBAL` rows).
3. Demo path: Radar (heat pump / balcony solar / MCP) → evidence → brief → Market Gaps.
4. Cancel Sitefire Pro by **2026-08-17**.
5. Sister Expo lab `trendspark-22c0c6` is design/scripts only — do not submit it as the web app.

## Sister remotes

| Remote | Role | Status (2026-08-13) |
| ------ | ---- | ------------------- |
| `origin` `gemini-spark-trends` | Lovable-connected web app | `main` @ `9a1685a` (plus any follow-up ingest/docs commits) |
| `parallel` `trendspark-web` | Cursor export | **Behind** origin (~147 commits). Do not force-push. |

`.env` stays local. Never commit secrets.
