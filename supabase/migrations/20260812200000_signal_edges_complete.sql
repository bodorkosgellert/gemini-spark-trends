-- Complete the signal_edges seed so the table matches the map /graph draws today.
--
-- 20260812140000 seeded only 30 of the 65 edges in FALLBACK_EDGES
-- (src/routes/graph.tsx). With the loader in edges.functions.ts reading the table, the missing
-- 35 would have silently halved the rings.
--
-- to_slug is hyphenated to match marketQueryFromSlug(): hyphens are word separators, and no
-- App Store market query in appstore-signals.json contains one. from_slug is a tag name and is
-- NOT hyphen-converted -- 'supply-chain' is a genuine tag.
--
-- Idempotent: re-running only refreshes weight/evidence/updated_at.

INSERT INTO public.signal_edges (from_slug, to_slug, edge_type, weight, evidence) VALUES
  ('agents', 'ai-agent', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('agents', 'rag-chatbot', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('agents', 'note-taking-ai', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('developer', 'ai-agent', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('developer', 'rag-chatbot', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('developer', 'password-manager', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('local', 'local-events', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('local', 'public-transport', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('local', 'repair-cafe', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('local', 'cycling-navigation', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('local', 'dog-walking', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('privacy', 'privacy-vpn', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('privacy', 'password-manager', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('privacy', 'receipt-scanner', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('privacy', 'budget-tracking', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('protocol', 'ev-charging', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('protocol', 'password-manager', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('video', 'language-learning', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('video', 'recipe-scanner', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('automation', 'invoice-freelancer', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('automation', 'habit-tracker', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('automation', 'meal-planning', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('automation', 'energy-tracker', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('data', 'energy-tracker', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('data', 'sleep-tracker', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('data', 'budget-tracking', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('voice', 'note-taking-ai', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('voice', 'language-learning', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('hardware', 'balcony-solar', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('hardware', 'heat-pump', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('hardware', 'ev-charging', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('hardware', 'energy-tracker', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('crypto', 'invoice-freelancer', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('crypto', 'budget-tracking', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('search', 'recipe-scanner', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('search', 'second-hand-clothes', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('b2b', 'invoice-freelancer', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('b2b', 'receipt-scanner', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('b2b', 'password-manager', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('creator', 'note-taking-ai', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('creator', 'local-events', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('compliance', 'receipt-scanner', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('compliance', 'invoice-freelancer', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('payments', 'budget-tracking', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('payments', 'invoice-freelancer', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('payments', 'car-sharing', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('services', 'dog-walking', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('services', 'repair-cafe', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('services', 'car-sharing', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('smb', 'invoice-freelancer', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('smb', 'receipt-scanner', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('finance', 'budget-tracking', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('finance', 'receipt-scanner', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('community', 'local-events', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('community', 'repair-cafe', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('community', 'second-hand-clothes', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('commerce', 'second-hand-clothes', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('commerce', 'meal-planning', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('climate', 'balcony-solar', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('climate', 'heat-pump', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('climate', 'ev-charging', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('climate', 'public-transport', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('climate', 'repair-cafe', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('supply-chain', 'second-hand-clothes', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('supply-chain', 'ev-charging', 'SHIPS_INTO', 1, 'hand-mapped crosswalk')
ON CONFLICT (from_slug, to_slug, edge_type) DO UPDATE SET
  weight = EXCLUDED.weight,
  evidence = EXCLUDED.evidence,
  updated_at = now();
