-- =============================================================================
-- AUSA Inter-Faculty Football Preseason (2026/27) — recreate + score-only results
-- Idempotent: safe to re-run. Paste into Supabase SQL editor.
--
-- Results (score only — no scorers, assists, or XI required):
--   FOSMAS 2–1 LAW          Sun 8 Nov 2026 16:30 WAT
--   MLS 1–1 FONAS           Mon 9 Nov 2026 16:30 WAT
--   Nursing 3–1 Engineering Thu 12 Nov 2026 16:30 WAT
--   FBMS 1–2 Medicine/MBBS  Sat 14 Nov 2026 15:00 WAT
--
-- Past scorelines do not need competition squads or match XI.
-- Fill squads later for live/upcoming fixtures; add scorers via Reconcile when known.
--
-- Does NOT touch the AUSA Interfaculty Football League seed.
-- =============================================================================

CREATE TEMP TABLE IF NOT EXISTS _pre_codes (
  code text PRIMARY KEY,
  dept_name text NOT NULL,
  team_name text NOT NULL
);
TRUNCATE _pre_codes;
INSERT INTO _pre_codes (code, dept_name, team_name) VALUES
  ('FOSMAS', 'Faculty of Social and Management Sciences', 'FOSMAS'),
  ('LAW', 'Law', 'Law'),
  ('MLS', 'Medical Laboratory Science', 'MLS'),
  ('FONAS', 'Faculty of Natural Sciences', 'FONAS'),
  ('NURSING', 'Nursing', 'Nursing'),
  ('ENG', 'Engineering', 'Engineering'),
  ('FBMS', 'Faculty of Basic Medical Sciences', 'FBMS'),
  ('MEDICINE', 'Medicine', 'Medicine');  -- public label MBBS → same club as league Medicine

DO $$
DECLARE
  v_sport uuid;
  v_tourn uuid;
  v_venue uuid;
  v_dept uuid;
  v_team uuid;
  r record;
BEGIN
  SELECT id INTO v_sport FROM public.sports WHERE lower(name) IN ('football', 'soccer') LIMIT 1;
  IF v_sport IS NULL THEN
    RAISE EXCEPTION 'Football sport row missing';
  END IF;

  -- Ensure faculty clubs exist (one team per short_code; no Nursing FC duplicate)
  FOR r IN SELECT * FROM _pre_codes LOOP
    INSERT INTO public.departments (name, short_code)
    VALUES (r.dept_name, r.code)
    ON CONFLICT (short_code) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_dept;

    SELECT id INTO v_dept FROM public.departments WHERE short_code = r.code;

    SELECT id INTO v_team FROM public.teams
    WHERE sport_id = v_sport
      AND department_id = v_dept
      AND is_guest = false
      AND deleted_at IS NULL
    LIMIT 1;

    IF v_team IS NULL THEN
      INSERT INTO public.teams (department_id, sport_id, name, is_guest)
      VALUES (v_dept, v_sport, r.team_name, false)
      RETURNING id INTO v_team;
    ELSE
      UPDATE public.teams
      SET name = r.team_name, deleted_at = NULL
      WHERE id = v_team;
    END IF;
  END LOOP;

  INSERT INTO public.venues (name, location)
  SELECT 'Main Field', 'Achievers University, Owo'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.venues v
    WHERE lower(v.name) = 'main field' AND v.deleted_at IS NULL
  );

  SELECT id INTO v_venue FROM public.venues
  WHERE lower(name) = 'main field' AND deleted_at IS NULL
  LIMIT 1;

  -- Tournament (event / preseason)
  SELECT id INTO v_tourn FROM public.tournaments
  WHERE name = 'AUSA Inter-Faculty Football Preseason'
    AND sport_id = v_sport
    AND season = '2026/27'
  LIMIT 1;

  IF v_tourn IS NULL THEN
    INSERT INTO public.tournaments (
      name, sport_id, category, season, rules, format, phases,
      competition_type, config, is_draft
    ) VALUES (
      'AUSA Inter-Faculty Football Preseason',
      v_sport,
      'friendly',  -- enum: league | knockout_cup | friendly
      '2026/27',
      '{"extra_time": false, "penalty_shootout": false}'::jsonb,
      'league',
      '[{"id": "preseason", "label": "Preseason", "starts": "2026-11-08", "ends": "2026-11-14"}]'::jsonb,
      'event',     -- app competition_type (varchar), not the category enum
      -- omit_stats: Stats Centre shows "not available" (score-only, no scorers planned)
      '{"max_squad_size": 25, "max_subs": 5, "authority": "AUSA Sports Committee", "omit_stats": true}'::jsonb,
      false
    )
    RETURNING id INTO v_tourn;
  ELSE
    UPDATE public.tournaments SET
      is_draft = false,
      category = 'friendly',
      competition_type = 'event',
      format = 'league',
      rules = '{"extra_time": false, "penalty_shootout": false}'::jsonb,
      phases = '[{"id": "preseason", "label": "Preseason", "starts": "2026-11-08", "ends": "2026-11-14"}]'::jsonb,
      config = '{"max_squad_size": 25, "max_subs": 5, "authority": "AUSA Sports Committee", "omit_stats": true}'::jsonb
    WHERE id = v_tourn;
  END IF;

  INSERT INTO public.tournament_teams (tournament_id, team_id)
  SELECT v_tourn, t.id
  FROM public.teams t
  JOIN public.departments d ON d.id = t.department_id
  JOIN _pre_codes c ON c.code = d.short_code
  WHERE t.sport_id = v_sport AND t.is_guest = false AND t.deleted_at IS NULL
  ON CONFLICT (tournament_id, team_id) DO NOTHING;

  -- Replace this competition’s fixtures (soft-delete then insert completed scorelines)
  UPDATE public.matches
  SET deleted_at = now(), status = 'cancelled'
  WHERE tournament_id = v_tourn
    AND deleted_at IS NULL;

  INSERT INTO public.matches (
    tournament_id, sport_id, home_team_id, away_team_id,
    status, current_period, home_score, away_score,
    scheduled_at, scope, competition_phase,
    allows_extra_time, allows_penalty_shootout, venue_id
  )
  SELECT
    v_tourn, v_sport, h.id, a.id,
    'completed', 'full_time', x.home_score, x.away_score,
    x.kickoff, 'official', x.phase,
    false, false, v_venue
  FROM (VALUES
    ('FOSMAS', 'LAW', 2, 1, timestamptz '2026-11-08 16:30:00+01', 'preseason_1'),
    ('MLS', 'FONAS', 1, 1, timestamptz '2026-11-09 16:30:00+01', 'preseason_2'),
    ('NURSING', 'ENG', 3, 1, timestamptz '2026-11-12 16:30:00+01', 'preseason_3'),
    ('FBMS', 'MEDICINE', 1, 2, timestamptz '2026-11-14 15:00:00+01', 'preseason_4')
  ) AS x(home_code, away_code, home_score, away_score, kickoff, phase)
  JOIN public.departments hd ON hd.short_code = x.home_code
  JOIN public.departments ad ON ad.short_code = x.away_code
  JOIN public.teams h ON h.department_id = hd.id
    AND h.sport_id = v_sport AND h.is_guest = false AND h.deleted_at IS NULL
  JOIN public.teams a ON a.department_id = ad.id
    AND a.sport_id = v_sport AND a.is_guest = false AND a.deleted_at IS NULL;
END $$;

-- Verification
SELECT
  t.name AS competition,
  t.season,
  t.is_draft,
  m.scheduled_at AT TIME ZONE 'Africa/Lagos' AS kickoff_wat,
  ht.name AS home,
  m.home_score,
  m.away_score,
  at.name AS away,
  m.status,
  m.competition_phase
FROM public.tournaments t
JOIN public.matches m ON m.tournament_id = t.id AND m.deleted_at IS NULL
JOIN public.teams ht ON ht.id = m.home_team_id
JOIN public.teams at ON at.id = m.away_team_id
WHERE t.name = 'AUSA Inter-Faculty Football Preseason'
  AND t.season = '2026/27'
ORDER BY m.scheduled_at;
