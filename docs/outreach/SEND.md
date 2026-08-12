# Send without your personal email

First emails are **interest-only** (see `SHORT-TEMPLATE.md`) — no price, no payment link.

Cold outreach from `you@gmail.com` burns trust and your personal reputation. Use a product domain.

## Recommended stack (SummerUP-speed)

1. **Domain** — `trendspark.app` / `gettrendspark.com` / any cheap `.dev` you control  
2. **Resend** — https://resend.com (free tier is enough for &lt;100 sends)  
3. **DNS** — add Resend’s SPF / DKIM / (optional) DMARC on that domain  
4. **From** — `Gellért <hello@yourdomain.com>` (never `noreply@`)  
5. **Optional** — SummerUP **n8n**: CSV → delay 3–8 min → Resend API  

Brevo works if you want a UI instead of API.

## One-time Resend setup

1. Create account → Domains → Add domain → copy DNS records  
2. Wait until domain shows **Verified**  
3. API Keys → create key → store in local `.env` as `RESEND_API_KEY` (never commit)  
4. Create Stripe Payment Link for **€39** → paste into replies when they say `dossier`

## Manual send from files (safest for Pitch Day)

1. Open a file in `personalized/` or a filled semi draft  
2. Copy subject + body into Resend dashboard **Emails → Send**, or into Apple Mail / Outlook **logged into the domain mailbox**  
3. Mark `sent=yes` + date in `tracker.csv`

## Semi-automated (n8n or script)

`queue/ready-to-send.json` shape:

```json
{
  "from": "Gellért <hello@yourdomain.com>",
  "to": "founder@example.com",
  "subject": "...",
  "text": "..."
}
```

n8n flow: Read JSON / Google Sheet → Wait → HTTP Request to `https://api.resend.com/emails` with Bearer `RESEND_API_KEY`.

Rate: **max ~15–20/day** on a brand-new domain for the first week.

## Do not

- Forward through your personal Gmail “Send as” without domain auth (looks spoofy)  
- BCC 40 people the same body  
- Use purchased “verified” email lists without a source line in the footer  

## Reply handling

Forward `hello@` to a mailbox you check, or use Resend inbound / Google Workspace on the domain. Keep replies **out** of personal Gmail if that was the goal — Workspace alias on the new domain is fine.
