# Claude / Cursor × Sitefire GEO (7-day trial)

Paste this file into Claude Code (or keep it open in Cursor) after you connect Sitefire MCP.  
**Goal:** find **AI citation gaps** on niches from TrendSpark’s ruthless filter — not to generate Sitefire CMS articles.

## Repo map (ignore wrong clones)

| Repo | Role |
|------|------|
| `bodorkosgellert/gemini-spark-trends` | Lovable **web flagship** |
| `bodorkosgellert/trendspark-web` | Cursor parallel of the web app |
| `bodorkoskellert/trendspark-22c0c6` | Expo / Bilt lab |
| `bodorkoskellert/trendspark` | **Stale** earlier Bilt export — do not clone for GEO work |

Results land in **web** repo: `src/data/ai-citation-gaps.json` (Radar badges). Cognee is optional (see below).

---

## 1. Start Sitefire trial (Lite or Pro — both have 7-day trial)

1. https://app.sitefire.ai — start trial (cancel before day 7 if you will not pay ~$249+/mo).  
2. Lite includes **MCP** + ~**150 tracked prompts**. Pro = more prompts/actions — not needed for TrendSpark.  
3. **Do not** only onboard `trendspark` as the brand. For whitespace you need **category / competitor** coverage.

### Domains / brands to add (examples — pick 8–12 niches)

Use niches from the LLM keepers table (photovoltaics, benefits, health trackers, fines, etc.):

| Niche | Example domain / brand to track |
|-------|----------------------------------|
| Balcony solar / PV | a major DE solar info or marketplace site |
| E-invoicing / admin | DATEV, sevDesk, or Lexoffice-class |
| Benefits / unemployment | a large gov-benefits explainer or HR SaaS |
| Medication / vaccines | a pharmacy or health-record app brand |
| Repair / local services | a directory or “task rabbit”–class site |

Let Sitefire generate prompts, then **edit** them toward product intent:

- “Best app to track Balkonkraftwerk savings and registration in Germany”  
- “Tool to check eligibility for [benefit] and track the application”  
- “App for family vaccination records in Sweden”  

Avoid pure news prompts (“what happened with X today”).

4. Run **Analyze**. Wait until visibility / citations populate.

---

## 2. Connect MCP

### Cursor
`~/.cursor/mcp.json` (Windows: `C:\Users\galla\.cursor\mcp.json`):

```json
"sitefire": {
  "type": "http",
  "url": "https://app.sitefire.ai/api/mcp"
}
```

Restart Cursor → Settings → MCP → approve Sitefire login.

### Claude Code

```bash
claude mcp add --transport http --scope user sitefire https://app.sitefire.ai/api/mcp
npx skills add sitefire-ai/skills
claude mcp list
```

Approve browser sign-in. Optional rule:

```text
Use Sitefire MCP for tracked topics, citations, and visibility only.
Prefer show/list/get. Ask before creating actions or articles.
```

---

## 3. Prompts to run (read-only — copy into Claude)

Run these **in order**. Do **not** ask to create actions/articles unless you want CMS drafts (burns trial quota).

1. **Verify:** `What Sitefire tools/actions are available? List my tracked topics.`  
2. **Coverage:** `List all tracked prompts grouped by topic. For each: engines covered, whether any brand/product is clearly recommended.`  
3. **Gaps:** `Which prompts have the weakest visibility or no clear product winner? Prefer niches about apps, trackers, eligibility, admin, health records, energy savings.`  
4. **Local:** `For each weak prompt, say whether a local/country-specific tool is cited (yes/no) and list top 3 cited domains.`  
5. **Export shape:** `Output a JSON array only, one object per weak/medium prompt, with keys: keyword, prompt, gap (high|medium|low), cited (string array), localCited (boolean), note (one sentence).`

---

## 4. Store results (recommended for 7 days)

### A — File → Radar (best for Pitch Day)

1. Open `gemini-spark-trends` or `trendspark-web`.  
2. Merge Claude’s JSON into [`src/data/ai-citation-gaps.json`](../src/data/ai-citation-gaps.json).  
3. Set `"status": "sitefire"`.  
4. `slug` = keyword lowercased, spaces → `-` (must match Radar signal slugs when possible).  
5. Refresh `/radar` → badges + `ai-gap` filter.

Paste to Cursor: *“Map this Sitefire JSON into ai-citation-gaps.json.”*

### B — Cognee (optional product track)

Cognee already syncs **Radar signals** on ingest (`syncGraph`), not Sitefire live.

To include GEO gaps in the graph later:

- Append each gap as a short prose doc (prompt + cited + gap level) via Cognee add_text, **or**  
- Add gap fields onto the signal document before `syncGraph`.

**Do not block the demo on Cognee.** File JSON is enough for judges; Cognee is parallel enrichment if the key works on the host.

---

## 5. Best queries for meaningful results (trial budget)

| Do | Don’t |
|----|--------|
| ≤ **40–60** sharp product prompts across 8–12 niches | Fill all 150 with vague “what is X” |
| Mix **global** keepers (CZ/ES/PL/IT…) + 1–2 DE | Only “TrendSpark” brand vanity |
| Score **high gap + software intent** | Treat news/politics prompts as opportunities |
| Re-read after 24h if citations refresh | Spend quota on “create article” agents |
| Pair with Trends/DFS demand on same keyword | Claim AI gap = proven revenue |

**Highest-value keepers:** high/medium gap + tracker/admin/finance/health tags + no local cite.

---

## 6. Trial hygiene

- Cancel Sitefire before day 7 unless you want Lite (~$249/mo).  
- MCP on Lite is enough.  
- Cancel card reminder on calendar day 6.

---

## 7. One-shot message to Claude Code

```text
Read docs/CLAUDE-SITEFIRE-GEO.md.
Use Sitefire MCP read-only. List weak-visibility prompts for app/tracker/admin/health/energy niches.
Return JSON for ai-citation-gaps.json (keyword, prompt, gap, cited, localCited, note).
Do not create Sitefire actions or articles.
```
