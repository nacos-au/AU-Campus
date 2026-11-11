-- Score live match ops — Phases 4–5
-- Officials, postpone, predicted/confirmed XI, public feedback.
-- Run in the Supabase SQL editor (safe to re-run).

-- ─── Match status: postponed ────────────────────────────────────────────────
DO $$
BEGIN
  ALTER TYPE public.match_status ADD VALUE IF NOT EXISTS 'postponed';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── Officials + postpone reason ────────────────────────────────────────────
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS referee_name TEXT,
  ADD COLUMN IF NOT EXISTS assistant_referee_1 TEXT,
  ADD COLUMN IF NOT EXISTS assistant_referee_2 TEXT,
  ADD COLUMN IF NOT EXISTS postpone_reason TEXT;

-- ─── Predicted / confirmed XI ───────────────────────────────────────────────
ALTER TABLE public.match_lineups
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'predicted',
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

DO $$
BEGIN
  ALTER TABLE public.match_lineups
    ADD CONSTRAINT match_lineups_status_check
    CHECK (status IN ('predicted', 'confirmed'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

UPDATE public.match_lineups
SET published_at = COALESCE(published_at, submitted_at, now())
WHERE published_at IS NULL;

-- ─── User feedback / bug reports ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.score_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path TEXT,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'bug'
    CHECK (category IN ('bug', 'idea', 'other')),
  message TEXT NOT NULL,
  contact_email TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_score_feedback_created
  ON public.score_feedback (created_at DESC);

ALTER TABLE public.score_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert score_feedback" ON public.score_feedback;
CREATE POLICY "Public insert score_feedback"
  ON public.score_feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(trim(message)) BETWEEN 3 AND 4000
  );

DROP POLICY IF EXISTS "Staff read score_feedback" ON public.score_feedback;
CREATE POLICY "Staff read score_feedback"
  ON public.score_feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          COALESCE(p.is_super_admin, false)
          OR EXISTS (
            SELECT 1 FROM public.app_roles ar
            WHERE ar.user_id = p.id
              AND ar.app = 'score'
              AND ar.role IN ('admin', 'record_keeper', 'platform_owner', 'super_admin')
          )
          OR EXISTS (
            SELECT 1 FROM public.score_user_roles sur
            WHERE sur.user_id = p.id
              AND sur.role IN ('admin', 'platform_owner', 'super_admin')
          )
        )
    )
  );
