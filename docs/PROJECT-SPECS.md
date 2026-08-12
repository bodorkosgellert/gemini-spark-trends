# TrendSpark — Project Specs (SummerUP 2026)

**For:** teammate (Richard) and anyone joining mid-week  
**Updated:** 2026-08-11  
**Pitch Day:** ~2026-08-14 (CODE University / SummerUP)  
**Owners:** Gellért (product / web / data) · Richard (pair on GTM / demo / stretch)

This is the **canonical product spec for the hackathon build**. Older Expo PRD (`trendspark-22c0c6/docs/PRD.md`) describes an earlier Bilt/mobile seed — treat it as historical unless noted.

---

## 1. One-liner

**TrendSpark** is a city-first demand radar for indie / vibe-coders: rising local intent → filtered tags → build brief / app angle, with **local−global Δ** as the differentiator.

> Building got free. Knowing what to build didn’t.

---

## 2. Problem

| Pain | Why charts alone fail |
|------|------------------------|
| Solo builders ship into silence | Trends tools show relative interest, not “what to build today” |
| Global feeds converge everyone | Same AI/GitHub clusters; no backyard edge |
| News/events pollute “trends” | Election / sports / celebrity spikes look like demand |
| Idea libraries are opaque | Competitors (e.g. Ideabrowser-style) don’t publish traction; still just catalogs |

---

## 3. Solution (MVP)

1. **Ingest** demand seeds (watchlist + Trends/DataForSEO + optional free Trends RSS).  
2. **Context** via Tavily (news / event evidence).  
3. **Ruthless LLM filter** → keep durable friction (admin, health, finance, local services…); drop geopolitics/news/sports.  
4. **Score** demand / supply / opportunity (public sources + optional DFS volume).  
5. **Radar UI** + **build brief** (hero flow, who pays, week-one tasks, why it dies).  
6. **Optional second surface:** Sitefire (or Otterly trial) → **AI citation gap** (does AI already name a product winner / local tool?).  
7. **Archive** kept signals over time (compounding asset).

**Wedge:** not “another Trends → GPT ideas table.”  
**Δ + city/language + archive + (optional) AI gap.**

\[
\Delta = \text{local interest} - \text{global interest}
\]

| Δ pattern | Label | Builder action |
|-----------|--------|----------------|
| Δ ≫ 0 | Berlin-native / backyard | Validate locally first; DE copy |
| Δ ≈ 0 | Same wave | Confirm on 2nd surface |
| Δ ≪ 0 | Global lead · local lag | Import playbook; don’t claim local spike |

---

## 4. Target user

| Segment | Job to be done |
|---------|----------------|
| Indie / vibe-coder (primary) | Pick one shippable niche this week |
| Solo founder Berlin / EU (outreach) | See local friction before building |
| Agents (later) | Pay-per-call signal API (x402 = **spec**, not live) |

**Not this week:** SEO agencies, enterprise GEO buyers, “% App Store revenue share” marketplace.

---

## 5. Repositories (what to open)

| Repo | Role | URL / path |
|------|------|------------|
| **`gemini-spark-trends`** | **Primary demo** — TanStack Start web app, Supabase Radar, briefs, AI-gap overlay | https://github.com/bodorkosgellert/gemini-spark-trends · live: https://gemini-spark-trends.lovable.app |
| **`trendspark-22c0c6`** | Expo lab — Cobalt UI, DFS/Tavily scripts, older PRD | https://github.com/bodorkoskellert/trendspark-22c0c6 |
| Older `trendspark` | Public seed / archive | https://github.com/bodorkoskellert/trendspark |

**Lovable editor credits are exhausted** → edit **`gemini-spark-trends` in Cursor**, push to `main` (no force-push / history rewrite — Lovable sync).

---

## 6. Product surfaces (web)

| Route | Spec |
|-------|------|
| `/` | Landing: brand, tagline, blue wave, CTAs to Radar |
| `/radar` | Live signals from Supabase; tags; sparklines; Build brief; **AI-gap** badges + filter |
| `/brief/$slug` | Full brief page |
| `/crosswalk` | Tag ↔ market correlation |
| `/graph` | Opportunity / graph exploration |
| `/store` | App Store–adjacent signals view |

**Design (web today):** light paper, Inter Tight + JetBrains Mono, primary blue.  
**Design (Expo lab):** Cobalt (`#3B6BF0`, Space Grotesk) — optional polish, not blocking pitch if web URL works.

---

## 7. Data & architecture

```
Watchlist / Trends (DFS or RSS)
        ↓
Ingest (Wiki, GH, HN, Tavily, optional DFS batch)
        ↓
Supabase: signals + signal_evidence + ingest_runs
        ↓
Radar UI  ←  ai-citation-gaps.json (Sitefire manual/MCP)
        ↓
Briefs (Anthropic preferred; Lovable AI fallback)
```

**Signal fields (conceptual):** slug, keyword, category, tags, demand_score, supply_score, opportunity_score, momentum, lead_weeks, why, series, evidence[].

**AI citation gap (overlay, not a live Sitefire API):**  
`src/data/ai-citation-gaps.json` → high / medium / low + prompt + cited + localCited.  
Setup: `docs/SITEFIRE-CITATION-GAP.md`.

**Rules:**

- Never invent Δ or % with an LLM. Math / API only.  
- LLM = filter, tags, briefs, app angles from **facts**.  
- No pytrends scrapers for the demo (ToS + breakage). Prefer DFS + RSS + Tavily.

---

## 8. Goals / non-goals (this week)

### Goals

- G1 — Shareable web URL for mentors, Apollo, Pitch Day.  
- G2 — Demo path: one **+Δ** local signal + one **−Δ** / crowded global signal.  
- G3 — Ruthless filter story (news out → durable tags → app angle).  
- G4 — Briefs work via `ANTHROPIC_API_KEY` without Lovable credits.  
- G5 — Optional Sitefire AI-gap on 5–10 keepers.  
- G6 — Outreach: LOI / pilot asks to Berlin founders (concierge brief), not “feedback only.”

### Non-goals

- Neo4j / Cognee / Lance as required infra (pitch spice only).  
- SerpAPI hourly firehose.  
- Worldmonitor clone / Failory mega-scrape.  
- Live x402 payments.  
- Sitefire Playwright/n8n login scraping.  
- Per-signal marketing landing pages.

---

## 9. SummerUP perks (use order)

| Perk | Use for TrendSpark |
|------|---------------------|
| Anthropic $100 | Briefs + ruthless filter |
| Tavily 8k | News / event context |
| Sitefire 7d | AI citation gap (manual or MCP → JSON) |
| n8n Cloud Pro | Optional daily digest cron after pitch |
| Otterly trial (optional) | Second GEO check on same prompts |
| Sliplane €250 | Host if Lovable host fails |
| KugelAudio / Super Audio | 60s voice briefing for stage |
| Cognee / Neo4j / Lance | Defer unless free time |
| Lovable | Credits out — Cursor owns code |
| Fideus / Amie | Admin / calendar only |

---

## 10. Env keys (local `.env`)

Required for Radar + briefs:

- `SUPABASE_*` / `VITE_SUPABASE_*`  
- `ANTHROPIC_API_KEY`

Optional: `TAVILY_API_KEY`, `DATAFORSEO_AUTH`, `COGNEE_API_KEY`, `LOVABLE_API_KEY`.

See `.env.example`. Never commit secrets.

---

## 11. Demo script (≈3 min)

1. Landing — tagline + “city-first / Δ”.  
2. Radar — open a **high opportunity** local-friction card; show tags.  
3. Toggle **ai-gap** — “AI names no local product → whitespace.”  
4. **Build brief** — hero flow + why it dies.  
5. Contrast a **low AI-gap / global crowded** card (e.g. e-invoicing).  
6. Ask: pilot LOI / “check your niche on our radar.”

---

## 12. Teammate workstreams

| Stream | Owner suggestion | Done when |
|--------|------------------|-----------|
| Local `npm run dev` + Anthropic briefs | Either | Briefs generate without Lovable |
| Sitefire trial → fill `ai-citation-gaps.json` | Either | 5+ rows `status: sitefire` |
| Berlin Δ pair on Radar (ingest or seed) | Gellért | Demo path has +Δ and −Δ |
| Apollo / hallway LOI outreach | Richard | ≥10 touches, 1–3 replies or LOI asks |
| Pitch slide: Ideabrowser vs TrendSpark wedge | Richard | One slide: catalog vs Δ radar |
| Voice 60s digest (optional) | Either | One audio for stage |

---

## 13. Success for Pitch Day

| Bar | Metric |
|-----|--------|
| Must | Live URL + Radar + one brief + clear Δ story |
| Should | AI-gap badges on real Sitefire rows; 1 LOI/pilot ask in flight |
| Nice | Voice digest; Neo4j screenshot; Cobalt polish on Expo |

---

## 14. Related docs

| Doc | What |
|-----|------|
| [CURRENT-STATE.md](./CURRENT-STATE.md) | Snapshot of shipped UI / open tasks |
| [SITEFIRE-CITATION-GAP.md](./SITEFIRE-CITATION-GAP.md) | How to fill AI-gap JSON |
| [AGENTS.md](../AGENTS.md) | Cursor / Lovable guardrails |
| `../trendspark-22c0c6/docs/SUMMARY.md` | Earlier teammate brief (partially outdated) |
| `../trendspark-22c0c6/docs/WEEK-PROGRESS.md` | Week log + Δ examples |
| `../trendspark-22c0c6/docs/PRD.md` | Historical Expo PRD |

---

## 15. Decision log (locked)

- Web-first PWA for pitch / outreach.  
- Humans: free / pay-after. Agents: x402 later.  
- Δ is product differentiator.  
- Ruthless filter > soft “keep geopolitics.”  
- Cursor continues when Lovable credits are empty.  
- Sitefire = validation layer, not demand firehose.
