-- Approach C: deterministic tag→market edges (ring diagram + outreach).
-- Cognee remains the NL ask layer; this table is source of truth for edges.

CREATE TABLE IF NOT EXISTS public.signal_edges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_slug TEXT NOT NULL,
  to_slug TEXT NOT NULL,
  edge_type TEXT NOT NULL DEFAULT 'SHIPS_INTO',
  weight NUMERIC NOT NULL DEFAULT 1,
  evidence TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_slug, to_slug, edge_type)
);

CREATE INDEX IF NOT EXISTS signal_edges_from_idx ON public.signal_edges (from_slug);
CREATE INDEX IF NOT EXISTS signal_edges_to_idx ON public.signal_edges (to_slug);

GRANT SELECT ON public.signal_edges TO anon, authenticated;
GRANT ALL ON public.signal_edges TO service_role;

ALTER TABLE public.signal_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signal edges are publicly readable"
  ON public.signal_edges FOR SELECT TO anon, authenticated USING (true);

-- Seed from the hand-mapped EDGES used by /graph (tag → App Store market query).
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
  ('climate', 'balcony-solar', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('climate', 'heat-pump', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('climate', 'ev-charging', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('climate', 'public-transport', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('climate', 'repair-cafe', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('hardware', 'balcony-solar', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('hardware', 'heat-pump', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('hardware', 'ev-charging', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('hardware', 'energy-tracker', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('finance', 'budget-tracking', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('finance', 'receipt-scanner', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('smb', 'invoice-freelancer', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('smb', 'receipt-scanner', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('compliance', 'receipt-scanner', 'SHIPS_INTO', 1, 'hand-mapped crosswalk'),
  ('compliance', 'invoice-freelancer', 'SHIPS_INTO', 1, 'hand-mapped crosswalk')
ON CONFLICT (from_slug, to_slug, edge_type) DO UPDATE SET
  weight = EXCLUDED.weight,
  evidence = EXCLUDED.evidence,
  updated_at = now();
