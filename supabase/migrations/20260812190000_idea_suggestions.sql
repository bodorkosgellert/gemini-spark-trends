-- Pitch-day archive: anonymous idea posts (no auth).
-- Anon may insert. Public may only read approved rows. Moderation = flip status in SQL / dashboard.

CREATE TABLE public.idea_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  pitch TEXT NOT NULL CHECK (char_length(pitch) BETWEEN 10 AND 800),
  city TEXT CHECK (city IS NULL OR char_length(city) <= 80),
  contact_email TEXT CHECK (contact_email IS NULL OR char_length(contact_email) <= 160),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idea_suggestions_approved_created_idx
  ON public.idea_suggestions (created_at DESC)
  WHERE status = 'approved';

ALTER TABLE public.idea_suggestions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.idea_suggestions TO anon;
GRANT SELECT, INSERT ON public.idea_suggestions TO authenticated;
GRANT ALL ON public.idea_suggestions TO service_role;

CREATE POLICY "Anyone can post an idea"
  ON public.idea_suggestions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Approved ideas are publicly readable"
  ON public.idea_suggestions
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');
