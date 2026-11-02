-- AU Score — DESTRUCTIVE. Paste IDs from PREVIEW, then run ONLY after you approve.
-- Keeps: listed venues, teams, ONE competition (+ its fixtures/rosters/theatre).
-- Soft-deletes: other venues, other teams, other competitions/matches.
-- Always keeps: sports, departments (structure).

BEGIN;

DO $$
DECLARE
  -- ── PASTE FROM PREVIEW ────────────────────────────────────────────────────
  keep_venue_ids uuid[] := ARRAY[
    -- 'venue-uuid-1'::uuid,
    -- 'venue-uuid-2'::uuid
  ];

  keep_team_ids uuid[] := ARRAY[
    -- 'team-uuid-1'::uuid,
    -- 'team-uuid-2'::uuid
  ];

  keep_tournament_ids uuid[] := ARRAY[
    -- 'competition-uuid'::uuid
  ];
  -- ─────────────────────────────────────────────────────────────────────────
BEGIN
  IF cardinality(keep_venue_ids) = 0
     OR cardinality(keep_team_ids) = 0
     OR cardinality(keep_tournament_ids) = 0 THEN
    RAISE EXCEPTION
      'Fill keep_venue_ids, keep_team_ids, and keep_tournament_ids before running APPLY';
  END IF;

  IF cardinality(keep_venue_ids) <> 2 THEN
    RAISE EXCEPTION 'Expected exactly 2 keep_venue_ids (got %)', cardinality(keep_venue_ids);
  END IF;

  IF cardinality(keep_tournament_ids) <> 1 THEN
    RAISE EXCEPTION 'Expected exactly 1 keep_tournament_ids (got %)', cardinality(keep_tournament_ids);
  END IF;

  -- Soft-delete matches outside the kept competition
  UPDATE public.matches m
  SET deleted_at = now(), status = 'cancelled'
  WHERE m.deleted_at IS NULL
    AND (m.tournament_id IS NULL OR m.tournament_id <> ALL (keep_tournament_ids));

  -- Hard-delete theatre for soft-deleted matches
  DELETE FROM public.match_events e
  USING public.matches m
  WHERE e.match_id = m.id AND m.deleted_at IS NOT NULL;

  DELETE FROM public.match_lineups l
  USING public.matches m
  WHERE l.match_id = m.id AND m.deleted_at IS NOT NULL;

  DELETE FROM public.period_scores p
  USING public.matches m
  WHERE p.match_id = m.id AND m.deleted_at IS NOT NULL;

  DELETE FROM public.set_scores s
  USING public.matches m
  WHERE s.match_id = m.id AND m.deleted_at IS NOT NULL;

  -- Competition structure outside the kept comp
  DELETE FROM public.bracket_fixtures bf
  WHERE bf.tournament_id <> ALL (keep_tournament_ids);

  DELETE FROM public.group_standings gs
  USING public.tournament_groups tg
  WHERE gs.group_id = tg.id AND tg.tournament_id <> ALL (keep_tournament_ids);

  DELETE FROM public.tournament_groups tg
  WHERE tg.tournament_id <> ALL (keep_tournament_ids);

  DELETE FROM public.season_awards sa
  WHERE sa.tournament_id IS NOT NULL AND sa.tournament_id <> ALL (keep_tournament_ids);

  IF to_regclass('public.tournament_rosters') IS NOT NULL THEN
    DELETE FROM public.tournament_rosters tr
    WHERE tr.tournament_id <> ALL (keep_tournament_ids);
  END IF;

  DELETE FROM public.tournament_teams tt
  WHERE tt.tournament_id <> ALL (keep_tournament_ids);

  -- Drop other competitions
  DELETE FROM public.tournaments t
  WHERE t.id <> ALL (keep_tournament_ids);

  -- Soft-delete venues not in the keep-2 list
  UPDATE public.venues v
  SET deleted_at = now(), is_active = false, updated_at = now()
  WHERE v.deleted_at IS NULL
    AND v.id <> ALL (keep_venue_ids);

  -- Soft-delete teams not kept
  UPDATE public.teams t
  SET deleted_at = now()
  WHERE t.deleted_at IS NULL
    AND t.id <> ALL (keep_team_ids);

  -- Drop registry rows for soft-deleted teams
  DELETE FROM public.player_sport_registry r
  USING public.teams t
  WHERE r.team_id = t.id AND t.deleted_at IS NOT NULL;

  -- Clear mock discipline (recreate from live cards later)
  DELETE FROM public.player_suspensions;
END $$;

COMMIT;

-- Spot-check (expect: 2 venues, your teams, 1 competition)
SELECT 'venues' AS what, id, name FROM public.venues WHERE deleted_at IS NULL ORDER BY name;
SELECT 'teams' AS what, id, name FROM public.teams WHERE deleted_at IS NULL ORDER BY name;
SELECT 'tournaments' AS what, id, name, category FROM public.tournaments ORDER BY name;
SELECT count(*) AS active_matches FROM public.matches WHERE deleted_at IS NULL;
