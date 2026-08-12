# Sitefire tracked-prompt set (60 prompts / 12 niches)

Drafted 2026-08-12 against `src/lib/watchlist.ts` (the 18 tracked keywords — the closest
thing in-repo to the "LLM keepers table"; see §Provenance).

**Paste these into Sitefire *before* running Analyze.** Sitefire's auto-generated prompts
measure *your brand's* visibility; these measure *whether anyone at all* gets cited, which is
the signal TrendSpark needs. Analyze consumes quota, so replacing the prompts afterwards
means paying twice.

> ## Plan limits (measured 2026-08-12)
>
> **Lite/trial caps active prompts at 20**, not the ~150 assumed in `CLAUDE-SITEFIRE-GEO.md`.
> Verified by `add_topics` refusing the write:
> `Prompt limit exceeded: activating 20 would result in 40/20 active prompts`. All 20 were
> consumed on sign-up by auto-generated topics about **TrendSpark's own category**
> (`market gap analysis framework`, `find profitable business niches`, …), which measure brand
> visibility, not niche whitespace.
>
> **Pro (7-day trial, started 2026-08-12) lifts it** — 36 niche prompts activated without
> complaint on top of the existing 20. ⚠️ **Cancel by 2026-08-17.**
>
> Freeing slots is a **web-UI job** either way: the MCP surface is read + add + create only,
> with no deactivate, delete, or update tool.
>
> Also: `add_topics` **generates prompt wording itself** and takes no prompt-text parameter.
> Topic, country, language, and count are settable; the sentences are not — and there is no
> `list_prompts` tool, so the generated wording can only be reviewed in the web UI. Getting the
> exact prompts below means editing them there.

## What is live (2026-08-12)

12 niche topics × **3 prompts** = 36 active prompts, added in three `add_topics` calls grouped
by market so the local-citation signal stays meaningful. Topic names are the exact
`src/lib/watchlist.ts` keywords, so they map 1:1 to Radar slugs.

`localCited` needs no dedicated A4 slot: the topic's `language_code` drives the generated
wording, so DE/`de` topics produce German prompts, which is what surfaces country-specific tools.

| Topic (= watchlist keyword) | Country / lang | Prompts |
|---|---|---|
| balcony solar | DE / de | 3 |
| heat pump installer | DE / de | 3 |
| repair cafe | DE / de | 3 |
| ai for bookkeeping | DE / de | 3 |
| **e invoicing germany** (CONTROL) | DE / de | 3 |
| ai receptionist | DE / en | 3 |
| eu ai act compliance | DE / en | 3 |
| digital product passport | DE / en | 3 |
| agentic commerce | US / en | 3 |
| voice ai agent | US / en | 3 |
| synthetic data | US / en | 3 |
| **mcp server** (CONTROL) | US / en | 3 |

Both controls are in, so a run that returns no citations anywhere can be diagnosed as incomplete
rather than misread as whitespace. Total tracked topics: 22 (10 brand + 12 niche).

Four topics — `balcony solar`, `heat pump installer`, `repair cafe`, `e invoicing germany` — were
created empty by the rejected Lite write, then reused by the Pro write. Prompts are **not**
deduplicated across `add_topics` calls, so do not re-add these.

## Method

Each prompt comes from a job statement with an explicit constraint clause:

> "I want to **(desire)** when **(situation)** so that I can **(outcome)** without **(constraint)**."

The `without` clause is the gap generator. Single-purpose products exist and get cited;
**workflow-chaining** products usually don't. Every niche below has one compound prompt (A2)
built directly off its `without`.

Archetypes: **A1** direct product intent · **A2** compound workflow · **A3** admin/obligation ·
**A4** local-language twin · **A5** alternative-seeking · **A6** persona-scoped.

## Calibration controls (run these — do not skip)

Niches 11 and 12 are **known-crowded**: AI reliably names products for them. If your controls
come back with no citations, your tracking is broken, not the category. Without controls you
cannot distinguish genuine whitespace from an incomplete Analyze run.

---

## 1. balcony solar — `balcony-solar` · DE

> …track what my Balkonkraftwerk actually saves, **without** doing the Marktstammdatenregister registration by hand.

| # | A | Prompt |
|---|---|--------|
| 1 | A1 | Best app to track balcony solar output and savings in Germany |
| 2 | **A2** | App that tracks Balkonkraftwerk savings and handles Marktstammdatenregister registration |
| 3 | A3 | How do I register a Balkonkraftwerk in the Marktstammdatenregister and keep proof of it? |
| 4 | A4 | Welche App zeigt die Ersparnis meines Balkonkraftwerks und übernimmt die Anmeldung? |
| 5 | A6 | App for a Berlin renter with balcony solar to prove savings to the landlord |

## 2. heat pump installer — `heat-pump-installer` · DE

> …compare installer quotes, **without** losing track of the Förderantrag.

| # | A | Prompt |
|---|---|--------|
| 1 | A1 | Best app to compare heat pump installer quotes in Germany |
| 2 | **A2** | Tool that collects heat pump quotes and tracks the BEG/KfW Förderantrag status in one place |
| 3 | A3 | How do I apply for heat pump Förderung and track the application status? |
| 4 | A4 | Welche Software vergleicht Wärmepumpen-Angebote und verfolgt den Förderantrag? |
| 5 | A5 | Alternative to calling installers individually for a heat pump quote in Germany |

## 3. repair cafe — `repair-cafe` · DE / Berlin

> …get a broken appliance fixed locally, **without** trawling Facebook groups for opening hours.

| # | A | Prompt |
|---|---|--------|
| 1 | A1 | App to find repair cafés near me in Berlin |
| 2 | **A2** | App that finds a repair café and books a slot for a specific broken appliance |
| 3 | A6 | App for a Berlin household to get a broken coffee machine fixed locally instead of replacing it |
| 4 | A4 | Gibt es eine App für Repair-Café-Termine und Reparaturanfragen in Berlin? |
| 5 | A5 | Alternative to Facebook groups for organising neighbourhood repair events |

## 4. ai for bookkeeping — `ai-for-bookkeeping` · DE / ES

> …hand clean books to the Steuerberater, **without** typing receipts in by hand.

| # | A | Prompt |
|---|---|--------|
| 1 | A1 | Best AI bookkeeping app for a German freelancer |
| 2 | **A2** | Tool that reads receipts with AI and exports them in DATEV format for the Steuerberater |
| 3 | A3 | How do I prepare my Umsatzsteuervoranmeldung and keep receipts GoBD-audit-proof? |
| 4 | A6 | App for a Berlin freelancer to collect receipts for the Steuerberater without manual entry |
| 5 | A4 | ¿Qué aplicación con IA lleva la contabilidad de un autónomo en España y presenta el IVA? |

## 5. ai receptionist — `ai-receptionist` · DE

> …stop missing patient calls, **without** hiring a second front-desk person.

| # | A | Prompt |
|---|---|--------|
| 1 | A1 | Best AI phone receptionist for a small clinic in Germany |
| 2 | **A2** | AI phone answering service that books appointments into an existing practice calendar in German |
| 3 | A6 | AI receptionist for a Berlin hair salon that takes German calls while staff are busy |
| 4 | A4 | KI-Telefonassistent für eine Arztpraxis, der Termine direkt in den Kalender einträgt? |
| 5 | A5 | Alternative to a human receptionist for a two-person German dental practice |

## 6. eu ai act compliance — `eu-ai-act-compliance` · EU / IT

> …ship an AI feature, **without** a lawyer redrafting our documentation every release.

| # | A | Prompt |
|---|---|--------|
| 1 | A1 | Best tool to document EU AI Act compliance for a small software company |
| 2 | **A2** | Software that classifies our AI system's risk tier and generates the technical documentation |
| 3 | A3 | How do I prove EU AI Act conformity for a limited-risk AI feature and keep the evidence? |
| 4 | A6 | EU AI Act compliance tool for a 10-person SaaS startup with one AI feature |
| 5 | A4 | Quale software aiuta una PMI italiana a documentare la conformità all'AI Act? |

## 7. digital product passport — `digital-product-passport` · EU / PL

> …ship into the EU, **without** chasing suppliers by email for material data.

| # | A | Prompt |
|---|---|--------|
| 1 | A1 | Best digital product passport software for an EU manufacturer |
| 2 | **A2** | Tool that collects supplier material data and generates the digital product passport QR code |
| 3 | A3 | How do I create a digital product passport for a textile product sold in the EU? |
| 4 | A6 | Digital product passport tool for a small furniture maker exporting into the EU |
| 5 | A4 | Jakie narzędzie tworzy cyfrowy paszport produktu dla małego producenta w Polsce? |

## 8. agentic commerce — `agentic-commerce` · global

> …sell to AI agents, **without** rebuilding checkout from scratch.

| # | A | Prompt |
|---|---|--------|
| 1 | A1 | Best platform to let an AI agent buy on behalf of a customer |
| 2 | **A2** | Tool that lets my store accept agent-initiated checkout and reconcile those payments |
| 3 | A3 | How do I make my product catalogue readable to AI shopping agents and track agent traffic? |
| 4 | A6 | Agentic commerce tooling for a small Shopify merchant |
| 5 | A5 | Alternative to a normal checkout flow for AI agents buying autonomously |

## 9. voice ai agent — `voice-ai-agent` · DE / CZ

> …capture every job request that comes in by phone, **without** retyping it into the CRM.

| # | A | Prompt |
|---|---|--------|
| 1 | A1 | Best voice AI agent platform for German-language customer calls |
| 2 | **A2** | Voice AI that handles inbound calls and writes the outcome into a CRM in German |
| 3 | A6 | Voice AI agent for a German Handwerker business to capture job requests by phone |
| 4 | A4 | Jaká hlasová AI dokáže odpovídat na telefonáty česky a zapsat objednávku? |
| 5 | A5 | Alternative to an answering machine for a small German trades business |

## 10. synthetic data — `synthetic-data` · EU

> …test on realistic data, **without** copying production personal data into staging.

| # | A | Prompt |
|---|---|--------|
| 1 | A1 | Best synthetic data tool for GDPR-safe testing |
| 2 | **A2** | Tool that generates synthetic patient data and documents GDPR compliance for an audit |
| 3 | A3 | How do I test software on realistic personal data without violating GDPR? |
| 4 | A6 | Synthetic data generator for a German health startup's test environment |
| 5 | A5 | Alternative to anonymising production data for staging environments in the EU |

---

## 11. CONTROL — mcp server · `mcp-server`

Expect **dominated**: AI names Anthropic/Claude/Cursor ecosystem tools confidently.

| # | Prompt |
|---|--------|
| 1 | Best MCP server for connecting an AI assistant to a database |
| 2 | How do I add an MCP server to my coding assistant? |
| 3 | Tool to host and monitor MCP servers in production |
| 4 | Where can I find a directory of MCP servers for developers? |
| 5 | Alternative to writing a custom MCP server |

## 12. CONTROL — e invoicing germany · `e-invoicing-germany`

Expect **dominated**: DATEV / sevDesk / Lexoffice cited reliably.

| # | Prompt |
|---|--------|
| 1 | Which tool should a German GmbH use for mandatory e-invoicing? |
| 2 | Software that creates ZUGFeRD/XRechnung invoices and archives them GoBD-compliant |
| 3 | How do I comply with the German e-invoicing mandate as a small business? |
| 4 | Welche Software erstellt XRechnung und archiviert GoBD-konform? |
| 5 | Alternative to DATEV for e-invoicing in Germany |

---

## Recording the results

Per prompt, capture the extended schema now in `src/data/ai-citation-gaps.json`:
`citationShape` · `answerType` · `engines` · `engineDisagreement` alongside the original fields.

`citationShape` is the field that earns its keep:

| Shape | Meaning | Action |
|-------|---------|--------|
| `dominated` | 1–2 brands cited consistently | drop |
| `fragmented` | several brands, none repeating across engines | **strongest signal** — demand real, no winner |
| `none` | no product named at all | check demand before believing it — AI silence often means the category has no commercial existence |

Pair with `supply_score` for the story (`gapStory()` in `src/lib/ai-citation-gap.ts`):

- low supply + gap → **whitespace** (nobody built it)
- high supply + gap → **geo arbitrage** (built, but invisible to AI — demand already proven)

## Provenance

The "162 → 25 keepers" table referenced in `CURRENT-STATE.md` and `CLAUDE-SITEFIRE-GEO.md`
is **not persisted anywhere in this repo** — it was an LLM ruthless-filter run whose output was
never written down. `CURRENT-STATE.md` item 3 still lists "surface kept archive / tag counts"
as an open task, and the Archive thesis argues those rows *are* the moat.

Until it exists, `src/lib/watchlist.ts` (18 keywords + tags) is the operative keeper list, and
these 60 prompts are drawn from it. If you find the original 25-row table, add it as
`src/data/keepers.json` and re-derive.
