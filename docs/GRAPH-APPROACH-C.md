# Graph Approach C (hybrid)

## What we shipped

1. **`signal_edges` table** — `supabase/migrations/20260812140000_signal_edges.sql`  
   - Unique `(from_slug, to_slug, edge_type)` → upsert, no duplicate edges.  
   - Seeded with hand-mapped tag → App Store market links (same idea as `/graph` rings).

2. **Cognee dated datasets** — `trendspark-YYYY-MM-DD`  
   - Each ingest writes/rebuilds **today’s** dataset instead of appending forever into `trendspark`.  
   - `askGraph` tries today, then yesterday, with a grounded “don’t invent scores” instruction.

3. **iTunes Search supply** — `src/lib/itunes.server.ts` + ingest blend  
   - Supply = max(GitHub crowding, App Store hit density) so physical/admin niches aren’t “empty.”

## How Postgres edges get updated

| Path | When |
|------|------|
| Migration seed | Once, when you run the SQL on Supabase |
| Manual SQL / admin upsert | Curate new `SHIPS_INTO` / `COMPETES_WITH` edges |
| Future ingest job | Optional: derive edges from tags × store markets and `ON CONFLICT DO UPDATE` |

Ring UI still uses the in-file `EDGES` map until a loader reads `signal_edges` (next small step). Source of truth for product should become the table.

## Cognify “background” explained

`runInBackground: true` means Cognee **accepts** documents and builds the graph **later**.  
`graphed: 60` = “we submitted 60 docs,” **not** “ask is ready.”  
Asking immediately can hit the **previous** (or empty) graph.

Options: poll a status API if Cognee exposes one; wait N seconds in UI; or dated datasets + “pending” message (what we do now).
