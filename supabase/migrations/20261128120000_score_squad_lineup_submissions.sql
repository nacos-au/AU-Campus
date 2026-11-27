-- =============================================================================
-- Score: squad roles, availability, formation, and team XI submission links.
--  * player_sport_registry: availability (club-level, per player per team).
--  * tournament_rosters: is_captain (competition side captain, one per side).
--  * tournament_teams.formation, tournaments.lineup_cutoff_minutes (default 60).
--  * match_lineups.formation; match_team_stats columns become nullable so a
--    blank stat is "not recorded" instead of zero.
--  * lineup_submission_links: private per-team link, token hash only.
--  * match_lineup_submissions: rep XIs held Pending until staff approve.
--  * RPCs: lineup_link_context, submit_lineup_via_link (anon-callable, token
--    gated), approve_lineup_submission / reject_lineup_submission (staff only).
-- Idempotent. Applied via supabase/score_squad_lineup_submissions_APPLY_ALL.sql.
-- =============================================================================

-- 1. Club-level availability ------------------------------------------------
ALTER TABLE public.player_sport_registry
  ADD COLUMN IF NOT EXISTS availability TEXT NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS availability_note TEXT,
  ADD COLUMN IF NOT EXISTS expected_return DATE;

ALTER TABLE public.player_sport_registry
  DROP CONSTRAINT IF EXISTS player_sport_registry_availability_check;
ALTER TABLE public.player_sport_registry
  ADD CONSTRAINT player_sport_registry_availability_check
  CHECK (availability IN ('available', 'doubtful', 'injured', 'unavailable'));

-- 2. Competition side: captain, formation, cut-off ---------------------------
ALTER TABLE public.tournament_rosters
  ADD COLUMN IF NOT EXISTS is_captain BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tournament_rosters_one_captain
  ON public.tournament_rosters (tournament_id, team_id)
  WHERE is_captain;

ALTER TABLE public.tournament_teams
  ADD COLUMN IF NOT EXISTS formation TEXT NOT NULL DEFAULT '4-3-3';

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS lineup_cutoff_minutes INTEGER NOT NULL DEFAULT 60;

ALTER TABLE public.tournaments
  DROP CONSTRAINT IF EXISTS tournaments_lineup_cutoff_check;
ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_lineup_cutoff_check
  CHECK (lineup_cutoff_minutes >= 0 AND lineup_cutoff_minutes <= 1440);

-- 3. Match sheet formation ----------------------------------------------------
ALTER TABLE public.match_lineups
  ADD COLUMN IF NOT EXISTS formation TEXT;

-- 4. Stats: blank means not recorded ------------------------------------------
ALTER TABLE public.match_team_stats
  ALTER COLUMN shots_on_target DROP NOT NULL,
  ALTER COLUMN shots_on_target DROP DEFAULT,
  ALTER COLUMN saves DROP NOT NULL,
  ALTER COLUMN saves DROP DEFAULT,
  ALTER COLUMN corners DROP NOT NULL,
  ALTER COLUMN corners DROP DEFAULT,
  ALTER COLUMN fouls DROP NOT NULL,
  ALTER COLUMN fouls DROP DEFAULT,
  ALTER COLUMN offsides DROP NOT NULL,
  ALTER COLUMN offsides DROP DEFAULT,
  ALTER COLUMN yellow_cards DROP NOT NULL,
  ALTER COLUMN yellow_cards DROP DEFAULT,
  ALTER COLUMN red_cards DROP NOT NULL,
  ALTER COLUMN red_cards DROP DEFAULT;

-- 5. Submission links ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lineup_submission_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  cutoff_minutes INTEGER,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  use_count INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT lineup_link_cutoff_check CHECK (
    cutoff_minutes IS NULL OR (cutoff_minutes >= 0 AND cutoff_minutes <= 1440)
  )
);

-- One live link per side per competition. Regenerating revokes the old one.
CREATE UNIQUE INDEX IF NOT EXISTS uq_lineup_link_active
  ON public.lineup_submission_links (tournament_id, team_id)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.match_lineup_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  link_id UUID REFERENCES public.lineup_submission_links(id) ON DELETE SET NULL,
  players JSONB NOT NULL DEFAULT '[]',
  formation TEXT,
  coach_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'superseded')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_lineup_submissions_match_team
  ON public.match_lineup_submissions (match_id, team_id, status);

ALTER TABLE public.lineup_submission_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_lineup_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage lineup_submission_links" ON public.lineup_submission_links;
CREATE POLICY "Staff manage lineup_submission_links" ON public.lineup_submission_links
  FOR ALL
  USING (private.can_manage_matches())
  WITH CHECK (private.can_manage_matches());

DROP POLICY IF EXISTS "Staff read match_lineup_submissions" ON public.match_lineup_submissions;
CREATE POLICY "Staff read match_lineup_submissions" ON public.match_lineup_submissions
  FOR SELECT
  USING (private.can_manage_matches());

DROP POLICY IF EXISTS "Staff update match_lineup_submissions" ON public.match_lineup_submissions;
CREATE POLICY "Staff update match_lineup_submissions" ON public.match_lineup_submissions
  FOR UPDATE
  USING (private.can_manage_matches())
  WITH CHECK (private.can_manage_matches());

-- 6. Rep context: squad, upcoming matches, cut-offs (token gated) -------------
CREATE OR REPLACE FUNCTION public.lineup_link_context(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_link public.lineup_submission_links%ROWTYPE;
  v_tournament public.tournaments%ROWTYPE;
  v_cutoff INTEGER;
  v_team RECORD;
BEGIN
  SELECT * INTO v_link
    FROM public.lineup_submission_links
   WHERE token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
     AND revoked_at IS NULL
     AND (expires_at IS NULL OR expires_at > now());
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'This link is no longer active. Ask the admin for a new one.');
  END IF;

  SELECT * INTO v_tournament FROM public.tournaments WHERE id = v_link.tournament_id;
  v_cutoff := COALESCE(v_link.cutoff_minutes, v_tournament.lineup_cutoff_minutes, 60);

  SELECT t.id, t.name, t.logo_url, d.short_code AS code, tt.formation
    INTO v_team
    FROM public.teams t
    LEFT JOIN public.departments d ON d.id = t.department_id
    LEFT JOIN public.tournament_teams tt
      ON tt.team_id = t.id AND tt.tournament_id = v_link.tournament_id
   WHERE t.id = v_link.team_id;

  UPDATE public.lineup_submission_links
     SET last_used_at = now()
   WHERE id = v_link.id;

  RETURN jsonb_build_object(
    'competition', jsonb_build_object('id', v_tournament.id, 'name', v_tournament.name, 'season', v_tournament.season, 'sport_id', v_tournament.sport_id),
    'team', jsonb_build_object('id', v_team.id, 'name', v_team.name, 'logo_url', v_team.logo_url, 'code', v_team.code),
    'formation', COALESCE(v_team.formation, '4-3-3'),
    'cutoff_minutes', v_cutoff,
    'squad', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'player_id', p.id,
          'first_name', p.first_name,
          'last_name', p.last_name,
          'position', COALESCE(p.position, psr.squad_role),
          'jersey_number', r.jersey_number,
          'is_captain', r.is_captain,
          'availability', COALESCE(psr.availability, 'available')
        ) ORDER BY p.last_name
      )
      FROM public.tournament_rosters r
      JOIN public.players p ON p.id = r.player_id
      LEFT JOIN public.player_sport_registry psr
        ON psr.player_id = p.id AND psr.team_id = v_link.team_id
      WHERE r.tournament_id = v_link.tournament_id AND r.team_id = v_link.team_id
    ), '[]'::jsonb),
    'matches', COALESCE((
      SELECT jsonb_agg(q.x ORDER BY q.kickoff)
      FROM (
        SELECT
          m.scheduled_at AS kickoff,
          jsonb_build_object(
            'id', m.id,
            'scheduled_at', m.scheduled_at,
            'home', m.home_team_id = v_link.team_id,
            'opponent', CASE WHEN m.home_team_id = v_link.team_id THEN at.name ELSE ht.name END,
            'cutoff_at', m.scheduled_at - make_interval(mins => v_cutoff),
            'closed', now() >= m.scheduled_at - make_interval(mins => v_cutoff),
            'pending', EXISTS (
              SELECT 1 FROM public.match_lineup_submissions s
               WHERE s.match_id = m.id AND s.team_id = v_link.team_id AND s.status = 'pending'
            )
          ) AS x
        FROM public.matches m
        JOIN public.teams ht ON ht.id = m.home_team_id
        JOIN public.teams at ON at.id = m.away_team_id
        WHERE m.tournament_id = v_link.tournament_id
          AND m.deleted_at IS NULL
          AND m.status = 'scheduled'
          AND v_link.team_id IN (m.home_team_id, m.away_team_id)
        ORDER BY m.scheduled_at
        LIMIT 8
      ) q
    ), '[]'::jsonb)
  );
END;
$$;

-- 7. Rep submission (token gated). Writes a Pending row only. ----------------
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
         t.lineup_cutoff_minutes
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
  IF v_bench < 1 THEN
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

-- 8. Staff review ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_lineup_submission(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_sub public.match_lineup_submissions%ROWTYPE;
BEGIN
  IF NOT private.can_manage_matches() THEN
    RETURN jsonb_build_object('error', 'Admin or record keeper access required.');
  END IF;

  SELECT * INTO v_sub FROM public.match_lineup_submissions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Submission not found.');
  END IF;
  IF v_sub.status <> 'pending' THEN
    RETURN jsonb_build_object('error', 'Only pending submissions can be approved.');
  END IF;

  INSERT INTO public.match_lineups
    (match_id, team_id, players, status, submitted_at, submitted_by, published_at, coach_name, formation)
  VALUES
    (v_sub.match_id, v_sub.team_id, v_sub.players, 'confirmed', v_sub.submitted_at, auth.uid(), now(),
     v_sub.coach_name, v_sub.formation)
  ON CONFLICT (match_id, team_id) DO UPDATE SET
    players = EXCLUDED.players,
    status = 'confirmed',
    submitted_at = EXCLUDED.submitted_at,
    submitted_by = EXCLUDED.submitted_by,
    published_at = EXCLUDED.published_at,
    coach_name = EXCLUDED.coach_name,
    formation = EXCLUDED.formation;

  UPDATE public.match_lineup_submissions
     SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
   WHERE id = p_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_lineup_submission(p_id UUID, p_note TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.can_manage_matches() THEN
    RETURN jsonb_build_object('error', 'Admin or record keeper access required.');
  END IF;

  UPDATE public.match_lineup_submissions
     SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(),
         review_note = NULLIF(btrim(p_note), '')
   WHERE id = p_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Only pending submissions can be rejected.');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.lineup_link_context(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_lineup_via_link(TEXT, UUID, JSONB, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_lineup_submission(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_lineup_submission(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lineup_link_context(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_lineup_via_link(TEXT, UUID, JSONB, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_lineup_submission(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_lineup_submission(UUID, TEXT) TO authenticated;
