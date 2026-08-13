# City-first observation engine rollout

The application is additive: current `signals`, `signal_evidence`, Radar cards, and legacy briefs
continue to work before this migration is applied.

## Current Cloud target

On 2026-08-13 the replacement project `yzdhyhyqxbrybjwkrlow` was intentionally selected and rebuilt
from all seven repository migrations. The migration history now matches the local filenames, all RLS
policies are active, and the graph contains its 65 deterministic seed edges.

The old `kwycapvevosfsvybrxtv` rows were not accessible and therefore were not copied. The new
database was seeded through one bounded Berlin ingest: 5 signals processed, 5 country-proxy market
snapshots, 10 observations, 50 app seeds, and 0 failures. Berlin resolved to `country-proxy`, so these
rows are not presented as fabricated city measurements.

## 1. Link and dry-run the Cloud project

Authenticate the Supabase CLI with the account that owns `yzdhyhyqxbrybjwkrlow`. Do not paste the
database password or access token into chat.

```powershell
npx supabase link --project-ref yzdhyhyqxbrybjwkrlow
npx supabase db push --linked --dry-run
```

The current dry run should report no pending migrations. If it proposes all historical migrations,
stop and check the account/project.

For future repository migrations, apply only after the dry run succeeds:

```powershell
npx supabase db push --linked
```

## 2. Verify automatically

The verifier checks that all three new tables are publicly readable and that `signal_briefs` exposes
the new stable cache-key columns. It prints only the project hostname and row counts, never API keys.

```powershell
npm run rollout:city-first:verify
```

Empty counts are valid before the first backfill. A missing table or column makes the command fail.

Local `.env` and `supabase/config.toml` now target `yzdhyhyqxbrybjwkrlow`. Before deploying, set the
same project URL, publishable key, and secret/service key in Lovable Cloud; local env changes do not
update hosted secrets.

## 3. Backfill one bounded market automatically

Point the command at the deployment running this code:

```powershell
$env:ROLLOUT_BASE_URL = "http://localhost:8080"
npm run rollout:city-first:backfill
```

Defaults are deliberately bounded to five keywords for Berlin, Germany. Optional overrides:

```powershell
node --env-file=.env scripts/city-first-rollout.mjs --backfill `
  --base-url=http://localhost:8080 --limit=5 --country=DE --city=Berlin --language=de
```

The command fails if no snapshots are written. An unresolved city is stored as `country-proxy`; the
app never fabricates a city score.

## 4. Verify the product flow

1. Set the navigation location to Berlin, DE and confirm `country=DE&city=Berlin` appears in the URL.
2. In Discover, run **Find observations** and inspect the source link and provenance labels.
3. Track one underlying signal, then run the bounded ingest again.
4. Confirm Radar shows the market scope and observation/app-direction counts.
5. Open its Brief and choose a derived direction before generating the execution brief.
6. Confirm Connections shows the typed signal → observation → friction → family → seed path.

## Rollback

The safest rollback is application-only: deploy the previous app version and leave the additive tables
in place. They do not alter canonical signal reads. Do not drop tables until their data has been
exported and no deployed version references them.
