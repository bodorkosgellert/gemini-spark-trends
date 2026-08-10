CREATE TABLE public.signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  keyword TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] NOT NULL DEFAULT '{}',
  demand_score NUMERIC NOT NULL DEFAULT 0,
  supply_score NUMERIC NOT NULL DEFAULT 0,
  opportunity_score NUMERIC NOT NULL DEFAULT 0,
  momentum NUMERIC NOT NULL DEFAULT 0,
  lead_weeks INTEGER NOT NULL DEFAULT 0,
  first_seen_at TIMESTAMPTZ,
  why TEXT,
  series JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.signal_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id UUID NOT NULL REFERENCES public.signals(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  metric TEXT NOT NULL,
  value NUMERIC,
  detail TEXT,
  url TEXT,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ingest_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  keywords_processed INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE INDEX signals_opportunity_idx ON public.signals (opportunity_score DESC);
CREATE INDEX signals_tags_idx ON public.signals USING GIN (tags);
CREATE INDEX signal_evidence_signal_idx ON public.signal_evidence (signal_id);

GRANT SELECT ON public.signals TO anon, authenticated;
GRANT SELECT ON public.signal_evidence TO anon, authenticated;
GRANT SELECT ON public.ingest_runs TO anon, authenticated;
GRANT ALL ON public.signals TO service_role;
GRANT ALL ON public.signal_evidence TO service_role;
GRANT ALL ON public.ingest_runs TO service_role;

ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingest_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signals are publicly readable" ON public.signals FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Evidence is publicly readable" ON public.signal_evidence FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Ingest runs are publicly readable" ON public.ingest_runs FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_signals_updated_at BEFORE UPDATE ON public.signals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();