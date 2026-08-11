# TrendSpark — Project Spec for Teammates

> Version: SummerUp Hackathon, 11 Aug 2026  
> Live app: https://gemini-spark-trends.lovable.app  
> Preview: https://id-preview--2ccafd6a-d0bb-4d05-8f4e-08994eb8d063.lovable.app  
> Repo: https://github.com/bodorkosgellert/trendspark

---

## 1. What we are building

TrendSpark is a live demand radar for indie builders and hackers. It reads public signals across the web (Google search volume, Wikipedia pageviews, GitHub repos, Hacker News, Reddit, web news) and converts them into a ranked list of **build opportunities**.

Each signal gets:
- **Demand score** (0–100) — how much people are searching / talking about it.
- **Supply score** (0–100) — how many apps/repos already serve it.
- **Opportunity score** (0–100) — the uncrowded demand.
- **Momentum** — % change vs. trailing baseline.
- **Lead weeks** — how many consecutive weeks the signal has been above baseline.
- **Build Brief** — a one-page AI-generated strategy doc (hero flow, pricing, why it dies, copy-paste coding prompt).

### The pitch in one sentence
> “Building got free. Knowing what to build didn’t. TrendSpark ranks the next thing to build before it gets crowded.”

---

## 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | TanStack Start v1 + React 19 | File-based routing, SSR/SSG, server functions |
| Styling | Tailwind CSS v4 | `src/styles.css` holds the cobalt theme tokens |
| UI kit | shadcn/ui + Radix primitives | `src/components/ui/*` |
| Database | Supabase Postgres (Lovable Cloud) | `signals`, `signal_evidence`, `signal_briefs`, `ingest_runs` |
| Auth | Supabase Auth (not yet used) | Ready for user accounts; currently no login required |
| Graph memory | Cognee | Projects scored signals into a knowledge graph for relationship queries |
| Search API | Tavily | Fresh web coverage / citations |
| Search volume | DataForSEO | Absolute Google search volume + 12-month history |
| LLM | Gemini 2.5 Flash via Lovable AI Gateway | Build brief generation |
| Hosting | Lovable Cloud deploy | Auto-publish to `.lovable.app` |

### Key directories

```
src/
  components/        # UI components (SiteNav, BlueWaves, shadcn)
  data/              # Static data (appstore-signals.json, tag-crosswalk.json)
  integrations/      # Supabase client, auth middleware, generated types
  lib/               # Business logic
    watchlist.ts              # 18 hand-seeded keywords
    ingest.server.ts          # Demand/supply scoring engine
    briefs.server.ts          # AI brief generator
    briefs.pipeline.server.ts # Cache + brief retrieval
    briefs.functions.ts       # ServerFn wrapper for /brief/$slug
    signals.functions.ts      # ServerFn wrapper for /radar
    cognee.server.ts          # Cognee graph sync + ask
    cognee.functions.ts       # ServerFn wrapper for /graph
    heat.ts                   # Blue heat scale for data points
  routes/            # Pages (TanStack Router)
    __root.tsx        # Root layout + nav + Toaster
    index.tsx         # Landing page
    radar.tsx         # Live signal dashboard
    brief.$slug.tsx   # Build brief page
    graph.tsx         # “The Web” graph explorer
    crosswalk.tsx     # App-tag ↔ signal-tag correlation study
    store.tsx         # App Store supply/demand ledger
    api/public/hooks/ingest.ts  # Ingest trigger endpoint
  styles.css          # Theme tokens, cobalt palette, fonts
  start.ts            # App entry + middleware
public/               # Static assets
supabase/             # Config
```

---

## 3. Database schema

### `signals` — the radar rows
| Column | Type | Meaning |
|---|---|---|
| `id` | uuid | Primary key |
| `slug` | text | URL-safe keyword (e.g. `balcony-solar`) |
| `keyword` | text | Original phrase (e.g. `balcony solar`) |
| `category` | text | `energy`, `ai-tools`, `smb`, `regulation`, `local`, `developer`, `creative`, `commerce` |
| `tags` | text[] | Free tags for filtering/crosswalk |
| `demand_score` | int | 0–100 |
| `supply_score` | int | 0–100 |
| `opportunity_score` | int | 0–100 |
| `momentum` | int | % change |
| `lead_weeks` | int | Consecutive weeks above baseline |
| `first_seen_at` | timestamptz | First HN mention |
| `why` | text | Human-readable explanation of the score |
| `series` | jsonb | 12-month/weekly history array (numbers) |
| `created_at` / `updated_at` | timestamptz | Auto |

### `signal_evidence` — raw readings per source
| Column | Type |
|---|---|
| `signal_id` | uuid → signals |
| `source` | text | `DataForSEO`, `Google Trends`, `Wikipedia`, `GitHub`, `Hacker News`, `Reddit`, `Tavily` |
| `metric` | text | e.g. `monthly_searches`, `new_repos_90d`, `stories_30d` |
| `value` | numeric | Number or null |
| `detail` | text | Human-readable sentence |
| `url` | text | Link to source |
| `observed_at` | timestamptz | Auto |

### `signal_briefs` — cached AI briefs
| Column | Type |
|---|---|
| `signal_id` | uuid → signals |
| `score_bucket` | int | `round(opportunity_score / 10)` |
| `model` | text | `google/gemini-2.5-flash` |
| `brief` | jsonb | Full brief object |
| `created_at` | timestamptz | Cache timestamp |

Unique on `(signal_id, score_bucket)`. A brief is regenerated only when the opportunity score moves into a new 10-point bucket.

### `ingest_runs` — audit log
| Column | Type |
|---|---|
| `status` | text | `running`, `ok`, `failed` |
| `keywords_processed` | int |
| `started_at` / `finished_at` | timestamptz |
| `notes` | text | Failure messages (truncated) |

---

## 4. Ingest engine pipeline

The ingest endpoint is `POST /api/public/hooks/ingest` with header `apikey: <SUPABASE_PUBLISHABLE_KEY>`.

### Sources per keyword
1. **DataForSEO** — absolute monthly Google search volume + 12-month series (primary demand evidence). One batched task covers all 18 keywords (~$0.09/run).
2. **Google Trends** — 12-month weekly interest series (fallback if DataForSEO has no volume).
3. **Wikipedia pageviews** — 12-month weekly pageview series (always reachable, fallback).
4. **GitHub Search API** — repos created in the last 90 days matching the keyword (supply).
5. **Hacker News (Algolia)** — first mention date + stories in last 30 days.
6. **Reddit** — posts in last 30 days + combined upvotes.
7. **Tavily** — fresh web articles in last 30 days (news coverage).

### Scoring formula
```ts
// src/lib/ingest.server.ts
const demand = clamp(
  normalize(momentum, -50, 200) * 45 +
  min(lead_weeks / 8, 1) * 30 +
  min(log(hnRecent + redditPosts) / log(120), 1) * 25,
  0, 100
);

const supply = round(
  min(log1p(githubRepos) / log(3000), 1) * 100
);

const opportunity = max(0, round(demand * (1 - supply / 130)));
```

A **good pitch signal** is high opportunity, high momentum, low supply, positive lead weeks.

### Current top signals (from live run, 11 Aug 2026)

| Keyword | Demand | Supply | Opportunity | Momentum | Volume/mo |
|---|---|---|---|---|---|
| balcony solar | 78 | 35 | 57 | +275% | 6,600 (low ad comp) |
| repair cafe | 53 | 35 | 39 | +57% | 3,600 (low) |
| eu ai act compliance | 61 | 73 | 27 | +108% | 170 |
| local first software | 45 | 72 | 20 | −8% | 140 |
| heat pump installer | 19 | 29 | 19 | negative | 22,200 (steady market) |

Bottom / saturated: `mcp server`, `ai agents`, `rag pipeline`, `vibe coding` (high search volume but supply 100).

---

## 5. Routes / pages

| Route | File | What it shows |
|---|---|---|
| `/` | `src/routes/index.tsx` | Landing page: hero, stats, live signals, pipeline |
| `/radar` | `src/routes/radar.tsx` | Full signal dashboard with filters, sparklines, inline build briefs |
| `/brief/$slug` | `src/routes/brief.$slug.tsx` | Full build brief for a single signal |
| `/graph` | `src/routes/graph.tsx` | “The Web” — circular explorer + “Ask the graph” panel |
| `/crosswalk` | `src/routes/crosswalk.tsx` | App-tag ↔ signal-tag correlation study |
| `/store` | `src/routes/store.tsx` | App Store supply/demand ledger |
| `/api/public/hooks/ingest` | `src/routes/api/public/hooks/ingest.ts` | Trigger ingest + sync to Cognee |

---

## 6. Build Brief generator

When a user clicks **“Build brief”** on a radar card, the app calls `getBrief({ slug })` via `src/lib/briefs.functions.ts`.

### Brief object shape
```ts
{
  headline: string;          // Short product name idea
  one_liner: string;         // What it does for whom
  hero_flow: string[];       // 3–5 steps in first 60 seconds
  who_pays: string;          // Buyer + budget line
  pricing: string;           // Concrete price + model
  first_week: string[];        // 4–6 shippable tasks
  domain_knowledge: string[];  // Things a generic builder must learn
  why_this_dies: string[];   // Exactly 3 strongest failure reasons
  disproof: string;           // Evidence that would prove it wrong in 2 weeks
  build_prompt: string;        // Paste-ready prompt for an AI coder
}
```

### Caching
Briefs are cached in `signal_briefs` keyed by `signal_id + score_bucket`. Regeneration only happens when the opportunity score moves ≥ 10 points. This keeps LLM costs low during a hackathon demo.

### LLM cost
- One brief ≈ ~1–2 Lovable AI credits.
- With 18 signals and bucket caching, a full refresh is ~10–20 credits, but most demo clicks hit the cache and cost nothing.

---

## 7. Cognee knowledge graph

Every ingest run pushes the top 60 scored signals plus their evidence into a Cognee graph (`dataset = "trendspark"`).

On `/graph` the user can ask relationship questions like:
- *“Which rising tags have the lowest supply?”*
- *“What market sits next to balcony solar but is not crowded?”*

Cognee answers by traversing the graph, not by querying SQL.

### Cost
One sync per ingest run (18 docs). Cognee free trial is active during the hackathon.

---

## 8. Secrets & environment variables

All API keys are stored as Lovable project secrets. They are injected into `process.env` inside server functions. Do not paste them into code.

| Secret | Used in | Purpose |
|---|---|---|
| `LOVABLE_API_KEY` | `briefs.server.ts` | LLM calls via Lovable AI Gateway |
| `TAVILY_API_KEY` | `ingest.server.ts` | Fresh web coverage |
| `COGNEE_API_KEY` | `cognee.server.ts` | Graph sync + ask |
| `DATAFORSEO_AUTH` | `ingest.server.ts` | Basic auth header for DataForSEO |
| `SUPABASE_URL` | auto | Lovable Cloud DB URL |
| `SUPABASE_PUBLISHABLE_KEY` | `signals.functions.ts`, ingest hook | Publishable DB key + ingest hook auth |
| `SUPABASE_SERVICE_ROLE_KEY` | `client.server.ts` | Admin DB access (server only) |

### For a teammate joining
If you clone the repo locally, you will **not** have these secrets. Either:
- Work inside the Lovable editor (secrets are already injected), or
- Ask the project owner to add the same keys to your local `.env`.

---

## 9. How to run locally

```bash
# 1. Clone
git clone https://github.com/bodorkosgellert/trendspark.git
cd trendspark

# 2. Install dependencies (bun is preferred in this project)
bun install

# 3. Start dev server
bun run dev
# → http://localhost:8080

# 4. Trigger ingest manually (from another terminal)
curl -X POST http://localhost:8080/api/public/hooks/ingest \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY"
```

### Lovable editor workflow (easiest)
1. Open https://lovable.dev/projects/2ccafd6a-d0bb-4d05-8f4e-08994eb8d063
2. Edit files in the browser; preview updates live.
3. Click **Publish** to push changes to the public URL.

---

## 10. Deployment / publishing

- **Preview** updates automatically as you type in the Lovable editor.
- **Live URL** requires clicking **Publish** in the Lovable UI. Frontend changes are not auto-deployed; backend changes are.
- The live URL is: https://gemini-spark-trends.lovable.app
- There is no custom domain yet.

---

## 11. Current watchlist

The 18 tracked keywords are hardcoded in `src/lib/watchlist.ts`:

```ts
ai agents, mcp server, voice ai agent, ai receptionist,
vibe coding, local first software, rag pipeline, ai video editing,
synthetic data, eu ai act compliance, digital product passport,
heat pump installer, balcony solar, repair cafe, e invoicing germany,
agentic commerce, x402 payments, ai for bookkeeping
```

These are seeds. The next big feature is auto-discovery: feed a root keyword to DataForSEO / Google Trends and get 50–200 related queries scored the same way.

---

## 12. Costs & credits during the hackathon

| Service | Balance / plan | Cost per use |
|---|---|---|
| Lovable AI Gateway | ~100 credits/month | Briefs ~1–2 credits; 18 cached briefs ≈ 10–20 |
| Tavily | free trial | 1 search per keyword per ingest = 18 calls |
| DataForSEO | ~$1 test balance | 1 batched task = ~$0.09 (covers 18 keywords) |
| Cognee | free trial | 1 sync per ingest run |
| GitHub API | free, unauthenticated | 10 requests/min per IP |
| HN Algolia | free | 2 requests per keyword |
| Wikipedia | free | 1 request per keyword |

### One full ingest run ≈ 1 Lovable credit + $0.09 DataForSEO.

---

## 13. Backlog / next steps (prioritised)

1. **Auto-discovery page (`/discover`)** — input a seed keyword, get 50–200 related queries from DataForSEO, filter by volume/supply, one-click add to watchlist.
2. **Geographic delta** — compare city-level vs country-level Google Trends (e.g. Berlin vs Germany) and surface the delta as a pitch metric.
3. **Submit queue (`/submit`)** — audience submits an idea in one sentence; app normalizes, enriches, scores, and returns a build brief live. Best demo moment.
4. **Auth + user watchlists** — let users save their own signals and briefs.
5. **Payment / revenue share** — implement “free until you earn” take-rate after the hackathon.
6. **Mobile parity** — port the remaining Hallmark mobile features (voice briefings, signal notifications, seller briefs) to web.

---

## 14. Quick teammate tasks (pick one)

| Task | Skill | File(s) | Impact |
|---|---|---|---|
| Add 5 new keywords to the watchlist | Editing | `src/lib/watchlist.ts` | More signals on demo |
| Improve the landing page copy | Copywriting | `src/routes/index.tsx` | Better pitch |
| Add a `/discover` page | Frontend + server | `src/routes/discover.tsx` | Auto-discovery MVP |
| Build the `/submit` idea queue | Full stack | `src/routes/submit.tsx` + `ingest.server.ts` | Best live demo |
| Add city-level geo comparison | Data | `src/lib/ingest.server.ts` | Better local pitch |
| Make the graph answers prettier | UI | `src/routes/graph.tsx` | Easier to demo |
| Add auth + saved watchlists | Backend | `supabase/` + routes | User retention |

---

## 15. Notes & caveats

- All demand numbers are **proxy evidence**, not guarantees. The pitch should never promise a trend will succeed.
- DataForSEO returns absolute search volume; Google Trends and Wikipedia are **indexed** to their own peak. The app prefers absolute volume when available.
- The current watchlist is hand-curated. The long-term value is in **automated discovery** from seeds.
- Cognee graph answers are best-effort; they improve as more signals are added.
- “Free until you earn” is a pricing thesis, not yet implemented as billing.

---

## 16. One-line contact

Project owner: Gellért Bodorkós  
Hackathon: SummerUp, Berlin 2026  
If you need secrets or publish access, ping Gellért in the Lovable editor or GitHub.
