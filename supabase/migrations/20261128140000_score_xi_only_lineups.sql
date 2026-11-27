-- =============================================================================
-- Score: XI-only prematch lineups.
-- Football admin rule: only the starting XI is named before kickoff; subs come
-- from the competition roster live (max subs per match). A named bench is still
-- enforced when the tournament has config.require_named_bench = true.
-- Re-creates public.submit_lineup_via_link. Idempotent.
-- =============================================================================

-- Rep submission (token gated). Writes a Pending row only. XI-only by default.
CREATE OR REPLACE FUNCTION public.submit_lineup_via_link(
  p_token TEXT,
  p_match_id UUID,
  p_players JSONB,
  p_formation TEXT DEFAULT NULL,
  p_coach_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_link public.lineup_submission_links%ROWTYPE;
  v_match RECORD;
  v_cutoff INTEGER;
  v_total INTEGER;
  v_distinct INTEGER;
  v_starters INTEGER;
  v_bench INTEGER;
  v_captains INTEGER;
  v_captain_starters INTEGER;
  v_id UUID;
BEGIN
  SELECT * INTO v_link
    FROM public.lineup_submission_links
   WHERE token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
     AND revoked_at IS NULL
     AND (expires_at IS NULL OR expires_at > now());
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'This link is no longer active. Ask the admin for a new one.');
  END IF;

  SELECT m.id, m.tournament_id, m.home_team_id, m.away_team_id, m.status, m.scheduled_at,
         t.lineup_cutoff_minutes, t.config
    INTO v_match
    FROM public.matches m
    JOIN public.tournaments t ON t.id = m.tournament_id
   WHERE m.id = p_match_id AND m.deleted_at IS NULL;
  IF NOT FOUND
     OR v_match.tournament_id IS DISTINCT FROM v_link.tournament_id
     OR v_link.team_id NOT IN (v_match.home_team_id, v_match.away_team_id) THEN
    RETURN jsonb_build_object('error', 'That match is not on this link.');
  END IF;
  IF v_match.status <> 'scheduled' THEN
    RETURN jsonb_build_object('error', 'This match is not open for submissions.');
  END IF;

  v_cutoff := COALESCE(v_link.cutoff_minutes, v_match.lineup_cutoff_minutes, 60);
  IF now() >= v_match.scheduled_at - make_interval(mins => v_cutoff) THEN
    RETURN jsonb_build_object('error', 'Submissions for this match are closed.');
  END IF;

  IF jsonb_typeof(p_players) IS DISTINCT FROM 'array' THEN
    RETURN jsonb_build_object('error', 'The lineup must be a list of players.');
  END IF;

  SELECT count(*), count(DISTINCT e->>'player_id')
    INTO v_total, v_distinct
    FROM jsonb_array_elements(p_players) e;
  SELECT
    count(*) FILTER (WHERE (e->>'is_starting')::boolean),
    count(*) FILTER (WHERE NOT COALESCE((e->>'is_starting')::boolean, false)),
    count(*) FILTER (WHERE COALESCE((e->>'is_captain')::boolean, false)),
    count(*) FILTER (WHERE COALESCE((e->>'is_captain')::boolean, false) AND COALESCE((e->>'is_starting')::boolean, false))
    INTO v_starters, v_bench, v_captains, v_captain_starters
    FROM jsonb_array_elements(p_players) e;

  IF v_total = 0 OR v_starters < 1 THEN
    RETURN jsonb_build_object('error', 'Name your starting XI.');
  END IF;
  IF v_distinct <> v_total THEN
    RETURN jsonb_build_object('error', 'A player is listed more than once.');
  END IF;
  IF v_bench < 1 AND COALESCE((v_match.config->>'require_named_bench')::boolean, false) THEN
    RETURN jsonb_build_object('error', 'Name at least one substitute on the bench.');
  END IF;
  IF v_captains <> 1 OR v_captain_starters <> 1 THEN
    RETURN jsonb_build_object('error', 'Choose one captain from the starting XI.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_players) e
     WHERE NOT EXISTS (
       SELECT 1 FROM public.tournament_rosters r
        WHERE r.tournament_id = v_link.tournament_id
          AND r.team_id = v_link.team_id
          AND r.player_id = (e->>'player_id')::uuid
     )
  ) AND EXISTS (
    SELECT 1 FROM public.tournament_rosters r
     WHERE r.tournament_id = v_link.tournament_id AND r.team_id = v_link.team_id
  ) THEN
    RETURN jsonb_build_object('error', 'Every named player must be on the competition squad.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.player_suspensions s
    JOIN jsonb_array_elements(p_players) e ON (e->>'player_id')::uuid = s.player_id
    WHERE s.is_active = true
  ) THEN
    RETURN jsonb_build_object('error', 'A suspended player cannot be named.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.player_sport_registry psr
    JOIN jsonb_array_elements(p_players) e ON (e->>'player_id')::uuid = psr.player_id
    WHERE psr.team_id = v_link.team_id AND psr.availability <> 'available'
  ) THEN
    RETURN jsonb_build_object('error', 'A named player is injured or unavailable. Remove them or contact the admin.');
  END IF;

  UPDATE public.match_lineup_submissions
     SET status = 'superseded'
   WHERE match_id = p_match_id AND team_id = v_link.team_id AND status = 'pending';

  INSERT INTO public.match_lineup_submissions
    (match_id, team_id, link_id, players, formation, coach_name, status)
  VALUES
    (p_match_id, v_link.team_id, v_link.id, p_players,
     NULLIF(btrim(p_formation), ''), NULLIF(btrim(p_coach_name), ''), 'pending')
  RETURNING id INTO v_id;

  UPDATE public.lineup_submission_links
     SET use_count = use_count + 1, last_used_at = now()
   WHERE id = v_link.id;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'status', 'pending');
END;
$$;
