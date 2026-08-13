-- City-first market history and evidence-backed app inspiration.
-- Additive: existing signals/evidence/briefs remain valid during rollout.

CREATE TABLE public.signal_market_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id UUID NOT NULL REFERENCES public.signals(id) ON DELETE CASCADE,
  ingest_run_id UUID REFERENCES public.ingest_runs(id) ON DELETE SET NULL,
  geo_key TEXT NOT NULL,
  country_code TEXT NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  city TEXT,
  language_code TEXT NOT NULL DEFAULT 'en',
  location_code INTEGER,
  measurement_scope TEXT NOT NULL CHECK (
    measurement_scope IN ('city-measured', 'country-proxy', 'global')
  ),
  demand_score NUMERIC NOT NULL DEFAULT 0 CHECK (demand_score BETWEEN 0 AND 100),
  supply_score NUMERIC NOT NULL DEFAULT 0 CHECK (supply_score BETWEEN 0 AND 100),
  opportunity_score NUMERIC NOT NULL DEFAULT 0 CHECK (opportunity_score BETWEEN 0 AND 100),
  momentum NUMERIC NOT NULL DEFAULT 0,
  lead_weeks INTEGER NOT NULL DEFAULT 0,
  series JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_scopes JSONB NOT NULL DEFAULT '{}'::jsonb,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.signal_observations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id UUID REFERENCES public.signals(id) ON DELETE CASCADE,
  canonical_query TEXT NOT NULL,
  geo_key TEXT NOT NULL DEFAULT 'GLOBAL',
  source TEXT NOT NULL,
  source_type TEXT NOT NULL,
  evidence_url TEXT,
  evidence_text TEXT NOT NULL,
  observed_behavior TEXT NOT NULL,
  evidence_type TEXT NOT NULL CHECK (
    evidence_type IN (
      'complaint', 'workaround', 'fragmentation', 'coordination',
      'new-capability', 'new-constraint', 'manual-workflow',
      'discovery', 'other'
    )
  ),
  friction TEXT,
  workaround TEXT,
  provenance TEXT NOT NULL CHECK (provenance IN ('measured', 'derived')),
  evidence_hash TEXT NOT NULL UNIQUE,
  observed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.app_seeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  observation_id UUID NOT NULL REFERENCES public.signal_observations(id) ON DELETE CASCADE,
  signal_id UUID REFERENCES public.signals(id) ON DELETE CASCADE,
  family TEXT NOT NULL CHECK (
    family IN (
      'discovery', 'monitoring', 'automation', 'coordination',
      'aggregation', 'prediction', 'tracking', 'comparison',
      'translation', 'visualization', 'marketplace', 'creator', 'utility'
    )
  ),
  title TEXT NOT NULL,
  user_type TEXT NOT NULL,
  problem TEXT NOT NULL,
  concept TEXT NOT NULL,
  variations JSONB NOT NULL DEFAULT '[]'::jsonb,
  why_interesting TEXT NOT NULL,
  interesting_score NUMERIC NOT NULL DEFAULT 0 CHECK (interesting_score BETWEEN 0 AND 100),
  commercial_score NUMERIC NOT NULL DEFAULT 0 CHECK (commercial_score BETWEEN 0 AND 100),
  buildability_score NUMERIC NOT NULL DEFAULT 0 CHECK (buildability_score BETWEEN 0 AND 100),
  validation_step TEXT NOT NULL,
  provenance TEXT NOT NULL DEFAULT 'derived' CHECK (provenance = 'derived'),
  source_hash TEXT NOT NULL,
  model TEXT NOT NULL,
  model_version TEXT NOT NULL,
  is_saved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (observation_id, family, source_hash, model_version)
);

ALTER TABLE public.signal_briefs
  DROP CONSTRAINT IF EXISTS signal_briefs_signal_id_score_bucket_key,
  ADD COLUMN geo_key TEXT NOT NULL DEFAULT 'GLOBAL',
  ADD COLUMN observation_set_hash TEXT NOT NULL DEFAULT 'legacy',
  ADD COLUMN direction_hash TEXT NOT NULL DEFAULT 'legacy',
  ADD COLUMN cache_key TEXT;
CREATE UNIQUE INDEX signal_briefs_cache_key_idx
  ON public.signal_briefs (cache_key)
  WHERE cache_key IS NOT NULL;

CREATE INDEX signal_market_latest_idx
  ON public.signal_market_snapshots (geo_key, observed_at DESC);
CREATE INDEX signal_market_signal_geo_idx
  ON public.signal_market_snapshots (signal_id, geo_key, observed_at DESC);
CREATE INDEX signal_observations_signal_idx
  ON public.signal_observations (signal_id, created_at DESC);
CREATE INDEX signal_observations_geo_idx
  ON public.signal_observations (geo_key, created_at DESC);
CREATE INDEX app_seeds_observation_idx
  ON public.app_seeds (observation_id, interesting_score DESC);
CREATE INDEX app_seeds_signal_idx
  ON public.app_seeds (signal_id, created_at DESC);

GRANT SELECT ON public.signal_market_snapshots TO anon, authenticated;
GRANT SELECT ON public.signal_observations TO anon, authenticated;
GRANT SELECT ON public.app_seeds TO anon, authenticated;
GRANT ALL ON public.signal_market_snapshots TO service_role;
GRANT ALL ON public.signal_observations TO service_role;
GRANT ALL ON public.app_seeds TO service_role;

ALTER TABLE public.signal_market_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_seeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Market snapshots are publicly readable"
  ON public.signal_market_snapshots FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Signal observations are publicly readable"
  ON public.signal_observations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "App seeds are publicly readable"
  ON public.app_seeds FOR SELECT TO anon, authenticated USING (true);
