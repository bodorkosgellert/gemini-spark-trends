# TrendSpark

**Building got free. Knowing what to build did not.**

A city-first demand radar for indie builders and vibe-coders. It reads public sources, scores demand against what already shipped, and writes a build brief for a real city, not a global ChatGPT list.

**Live:** https://trendspark2026.lovable.app

**Demo (1 min):** https://www.loom.com/share/30c3336440d949bda9af3f72f6095fbf

Default market: **Berlin, DE**.

## What runs

| Route | What you see |
| ----- | ------------ |
| / | Product story |
| /radar | Scored signals (demand, supply, opportunity) plus evidence and briefs |
| /store | App Store shelf: occupancy, freshness, incumbent lock |
| /graph | Connections: demand tags wired to App Store markets |
| /crosswalk | Do attention tags lead launches? |
| /discover | Observed human friction to app directions (no invented keywords) |
| /arbitrage | Market Gaps: proven in one place, thin in another |
| /suggest | Public idea / feedback inbox |

Scores and deltas come from **ingest**, never from an LLM inventing percentages.

## Stack

TanStack Start, Vite, Tailwind, Supabase. Briefs: Anthropic first. Enrich: Tavily, GitHub Search, Apple iTunes Search, Google Trends, optional DataForSEO. AI citation overlay: Sitefire (manual readings). Graph ask: Cognee.

SummerUP build: first commit **8 August 2026** (Lovable template). Pipeline and database **10 August**. City-first Radar and outreach pack **12-13 August**. An earlier Expo prototype existed; this repo is the product to judge.

## Local

`sh
npm i
cp .env.example .env
npm run dev
`

Use the port Vite prints. Required for Radar: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY, and the matching VITE_* keys. Briefs need ANTHROPIC_API_KEY.

Do not commit .env.

## Team

Gellert: product, data, the web app.

Richard: go-to-market, demo, outreach.

## Docs

- [docs/CURRENT-STATE.md](./docs/CURRENT-STATE.md) -- what works
- [docs/EMAIL-OUTREACH.md](./docs/EMAIL-OUTREACH.md) -- interest-first outreach (no price in the first mail)
- [AGENTS.md](./AGENTS.md) -- stack notes for agents
