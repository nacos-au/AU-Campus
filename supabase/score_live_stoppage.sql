-- Live stoppage / added time for football (run in Supabase SQL editor).
-- Accumulates Time lost into boarded +N on matches; fixes score recompute for
-- own goals, pens outside shootout, and disallowed_goal voids.

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS clock_stoppage_seconds INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clock_boarded_stoppage_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clock_time_lost_started_at TIMESTAMPTZ;

-- Scoreboard: goals + pens in open play + own goals; never shootout pens.
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

-- Void original goal when a disallowed / disallowed_goal event references it.
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
