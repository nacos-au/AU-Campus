-- AU Score — live ops schema (Phases 1–5). Run this ONE script in Supabase SQL editor.
-- Safe to re-run. Covers clock, stoppage, officials, postpone, lineup status, feedback.

-- ─── Live clock + stoppage ──────────────────────────────────────────────────
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS clock_elapsed_seconds INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clock_is_running BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS clock_is_time_lost BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS clock_running_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clock_stoppage_seconds INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clock_boarded_stoppage_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clock_time_lost_started_at TIMESTAMPTZ;

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

-- ─── User feedback ──────────────────────────────────────────────────────────
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
  WITH CHECK (char_length(trim(message)) BETWEEN 3 AND 4000);

DROP POLICY IF EXISTS "Staff read score_feedback" ON public.score_feedback;
CREATE POLICY "Staff read score_feedback"
  ON public.score_feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.score_admins a WHERE a.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.score_user_roles r
      WHERE r.user_id = auth.uid()
        AND r.role IN ('platform_owner', 'super_admin', 'admin')
    )
  );

-- ─── Score recompute (football + basketball; skip shootout pens) ────────────
CREATE OR REPLACE FUNCTION public.recalculate_match_score(p_match_id UUID)
RETURNS VOID AS $$
DECLARE
  v_home_score INTEGER := 0;
  v_away_score INTEGER := 0;
  v_home_team_id UUID;
  v_away_team_id UUID;
  v_sport_slug TEXT;
BEGIN
  SELECT m.home_team_id, m.away_team_id, lower(s.name)
  INTO v_home_team_id, v_away_team_id, v_sport_slug
  FROM public.matches m
  LEFT JOIN public.sports s ON s.id = m.sport_id
  WHERE m.id = p_match_id;

  IF v_sport_slug = 'basketball' THEN
    SELECT
      COALESCE(SUM(
        CASE
          WHEN team_id = v_home_team_id AND NOT is_void THEN
            CASE event_type
              WHEN 'two_pointer' THEN 2
              WHEN 'field_goal' THEN 3
              WHEN 'free_throw' THEN 1
              ELSE 0
            END
          ELSE 0
        END
      ), 0),
      COALESCE(SUM(
        CASE
          WHEN team_id = v_away_team_id AND NOT is_void THEN
            CASE event_type
              WHEN 'two_pointer' THEN 2
              WHEN 'field_goal' THEN 3
              WHEN 'free_throw' THEN 1
              ELSE 0
            END
          ELSE 0
        END
      ), 0)
    INTO v_home_score, v_away_score
    FROM public.match_events
    WHERE match_id = p_match_id;
  ELSE
    SELECT
      COALESCE(SUM(
        CASE
          WHEN NOT is_void AND COALESCE(period, '') <> 'penalty_shootout' THEN
            CASE
              WHEN event_type IN ('goal', 'penalty_scored') AND team_id = v_home_team_id THEN 1
              WHEN event_type = 'own_goal' AND team_id = v_away_team_id THEN 1
              ELSE 0
            END
          ELSE 0
        END
      ), 0),
      COALESCE(SUM(
        CASE
          WHEN NOT is_void AND COALESCE(period, '') <> 'penalty_shootout' THEN
            CASE
              WHEN event_type IN ('goal', 'penalty_scored') AND team_id = v_away_team_id THEN 1
              WHEN event_type = 'own_goal' AND team_id = v_home_team_id THEN 1
              ELSE 0
            END
          ELSE 0
        END
      ), 0)
    INTO v_home_score, v_away_score
    FROM public.match_events
    WHERE match_id = p_match_id;
  END IF;

  UPDATE public.matches
  SET home_score = v_home_score, away_score = v_away_score
  WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_disallowed_goal()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type IN ('disallowed', 'disallowed_goal') AND NEW.details ? 'original_event_id' THEN
    UPDATE public.match_events
    SET is_void = true
    WHERE id = (NEW.details->>'original_event_id')::UUID
      AND match_id = NEW.match_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_disallowed_goal ON public.match_events;
CREATE TRIGGER trg_disallowed_goal
  AFTER INSERT ON public.match_events
  FOR EACH ROW
  WHEN (NEW.event_type IN ('disallowed', 'disallowed_goal'))
  EXECUTE FUNCTION public.handle_disallowed_goal();
