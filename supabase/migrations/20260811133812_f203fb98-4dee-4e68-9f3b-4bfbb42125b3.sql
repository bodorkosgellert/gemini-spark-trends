CREATE TABLE public.signal_briefs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id UUID NOT NULL REFERENCES public.signals(id) ON DELETE CASCADE,
  score_bucket INTEGER NOT NULL,
  model TEXT NOT NULL,
  brief JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (signal_id, score_bucket)
);
GRANT SELECT ON public.signal_briefs TO anon;
GRANT SELECT ON public.signal_briefs TO authenticated;
GRANT ALL ON public.signal_briefs TO service_role;
ALTER TABLE public.signal_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Briefs are publicly readable" ON public.signal_briefs FOR SELECT TO anon, authenticated USING (true);