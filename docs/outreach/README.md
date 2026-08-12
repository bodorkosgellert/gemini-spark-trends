# Outreach send pack (no personal Gmail)

Ready-to-edit message files for two waves. Shelf numbers come from `src/data/appstore-signals.json` (snapshot **10 Aug 2026**). Do not invent regional Radar scores.

## What is in this folder

| Path | What |
|------|------|
| `personalized/` | ~20 full emails — app + seller + dated shelf line already filled |
| `semi/` | 5 category skeletons — swap only name / app / storefront / email |
| `tracker.csv` | CRM sheet — paste emails, mark sent / reply |
| `queue/ready-to-send.json` | Machine-readable queue for Resend / n8n |
| `SEND.md` | How to send **without** your personal inbox |

## Two waves (do both, not 80 of one)

**Wave A — personalized (aim 25–40)**  
Open `personalized/*.md`. Find each seller’s public contact (site / App Store support / Hunter). Paste `To:` into the file header. Send one-by-one or via Resend queue.

**Wave B — semi-templated (aim ~40)**  
Pick a niche in `semi/`. For each row in `tracker.csv` with `wave=semi`, fill `{{first_name}}`, `{{app}}`, `{{seller}}`, `{{storefront}}` from Store / Apollo. Same finding block per niche — that is intentional batching, not fake “personalisation.”

## Channel rules (from EMAIL-OUTREACH.md)

- **Email:** US, UK corps, IE, NL, FR, AU  
- **Not cold email:** DE, AT, CH, IT, ES, PL → LinkedIn hand notes only  
- Lead with finding + **€39** dossier, not a call  
- Footer: how you found them + `stop` unsubscribe  

## Suggested send order (Pitch Day ~14 Aug)

1. Wave A heat-pump + balcony-solar + invoice (strongest LOI story)  
2. Wave A habit / transport / repair / RAG (smaller)  
3. Wave B same niches for the next 20–40 contacts  
4. Cap ~20/day on a new domain; warm up 3–5 days if possible  

## What you still must do by hand

1. Buy/use a **sending domain** (not `@gmail.com`) — see `SEND.md`  
2. Look up emails (Hunter / Apollo / company contact) → fill `tracker.csv`  
3. Review each personalized file once (2 min) before send  
4. Stripe Payment Link for €39 when someone replies `dossier`  
