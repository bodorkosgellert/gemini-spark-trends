# Email outreach plan (TrendSpark / SummerUP)

Consult this before writing or sending cold email. Not legal advice.

## Goal

Sell-before-build learning: dated **€39 / ~$45** niche dossiers from real shelf + demand readings — not waitlist vanity, not fabricated regional demos.

## Channels by country

| Channel | Markets |
|---------|---------|
| Email (opt-out B2B style) | US, UK (companies not sole traders), IE, NL, FR, AU |
| LinkedIn handwritten | DE, AT, CH, IT, ES, PL, CZ, and other opt-in defaults |
| In person | Berlin / Pitch Day (highest conversion) |

You are in Berlin → GDPR still applies to processing (Art. 3). If using Apollo-style lists, note source in the footer (Art. 14 spirit).

## Do not

- Mail-merge “searches are up in {{country}}” as personalisation.
- Send fabricated per-region Radar scores.
- Email DE/AT/CH/IT/ES/PL cold without consent.
- Lead with TAM / “financial potential” you cannot check.
- Claim local−global Δ in copy until that number exists in the web app.

## Do

- Customise on **App Store shelf / category / seller**, not passport.
- Date every finding. Label demo GEO overlays as demo.
- Show **€39** before asking for a call.
- Be transparent: SummerUP hackathon, Pitch Day ~14 Aug 2026.

## Prospect sources

1. **`src/data/appstore-signals.json`** — `top[].seller`, `released`, category `query`, six storefronts.
2. Apollo / Hunter — founder/CEO in US/UK/NL, indie tools (enrich emails carefully).
3. LinkedIn — opt-in countries; hand messages only.
4. Product Hunt / company contact pages for the same niches.

**First wave size:** 25–40 personalized emails (not 500).  
**Rough conversion:** open 40–60%, reply 5–15%, pay 1–5% → ~0–2 dossiers from 40 sends. Pitch Day > cold email.

## Batching (accelerate customisation)

Group by **category** (e.g. balcony solar, repair, heat pump, invoice):

1. One DataForSEO / Radar pull per group (~cents).
2. One dossier skeleton per group.
3. Per email: swap seller, app name, country store, dated shelf line only.

Example: 5 groups × 6 sellers = 30 sends in one evening.

## Sender infrastructure

| Tool | Free tier (order of magnitude) | Use when |
|------|--------------------------------|----------|
| **Resend** (recommended) | ~3k/mo, often 100/day | Dev-friendly, domain DNS |
| Brevo | ~300/day | Want UI/CRM, EU posture |
| Postmark | ~100/mo test | Pay later for deliverability |
| Gmail | Manual | &lt;30 hand emails this week |

- From: `you@yourdomain.com` (preferred) or real-name Gmail — never no-reply.
- Footer: name, Berlin, postal line (US/CAN-SPAM), how you found them, unsubscribe.
- CRM: spreadsheet (name, company, source, market, sent, reply).

## Sequence per prospect

1. Find via Store ledger (recent release, category you measure).
2. Optional: one real volume reading for their keywords.
3. Send **finding**, not pitch (shelf + trend + dated).
4. State €39 / $45 → Stripe Payment Link or “reply YES / invoice”.
5. Link to web Radar/brief (SSR preview), not Expo shell.

## Subject lines

- `App Store shelf note on [Category] — dated [DD Mon YYYY]`
- `Quick read on [App] vs demand (dated)`

## Body template

```
Hi [Name],

I’m Gellért — building TrendSpark at SummerUP (CODE Berlin; Pitch Day ~14 Aug).
I found [App Name] via the [DE/US/UK] App Store ([genre], released [Month Year]).

Quick finding (not a generic “your market is hot”):
• In our [category] shelf read, top-3 apps hold ~[X]% of ratings; fresh-12m rate ~[Y]%.
• Search interest for “[keyword]” is [±N]% vs its own earlier baseline (snapshot [date]).
• When people ask AI for a product in this niche, answers often cite [blogs / directories / brands…] — not a clear local winner. (Demo GEO labels called out if still demo.)

TrendSpark scores city demand against what’s already shipped, then writes a build brief.
Humans browse free; a one-page dossier for your niche is €39 ($45) — dated scores, shelf reading, caveat.

If useful: reply “dossier” and I’ll send a Stripe link + PDF.
If not: reply “pass”.

How I found you: public App Store seller listing for [App].
Unsubscribe: reply “stop”.

Gellért
Berlin
[postal address if emailing US]
[Radar or brief URL]
```

## Pricing stance

- One price in **EUR** (€39); ~$45 optional for US readers.
- Sell the **dated one-pager** now; don’t sell “platform access” yet.
- Stripe Payment Link is enough — no in-app billing required for Pitch Day.

## Markets to start (three only)

1. **US** — open channel, English, largest.
2. **UK** — corporate subscribers, English, timezone.
3. **NL or AU** — open-ish, English fluency; AU = second timezone.

Plus Berlin in person.

## Related repo docs

- `docs/SITEFIRE-CITATION-GAP.md` — GEO overlay (not live API).
- `docs/SITEFIRE-PROMPT-SET.md` — prompts; product-intent &gt; open-ended debate.
- `AGENTS.md` — stack and live gates.

Updated: 2026-08-12.
