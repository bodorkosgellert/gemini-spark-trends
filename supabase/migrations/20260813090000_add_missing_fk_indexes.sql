-- Cover foreign keys flagged by Supabase's performance advisor.
CREATE INDEX signal_briefs_signal_idx
  ON public.signal_briefs (signal_id);
CREATE INDEX signal_market_ingest_run_idx
  ON public.signal_market_snapshots (ingest_run_id);
