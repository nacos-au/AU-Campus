-- AU Score purge — YOUR keep list (no UUIDs).
-- KEEP:
--   venues: Main Field, Joked Field
--   competition: Inter-Faculty Preseason (flexible name match)
--   ALL teams + ALL players
-- REMOVE:
--   other venues (soft-delete)
--   other competitions + their matches/theatre
-- NEVER touches: sports, departments, teams, players, player_sport_registry
--
-- Run PREVIEW first if you want a look. Then run this once in Supabase SQL.

BEGIN;

DO $$
DECLARE
  keep_venue_ids uuid[];
  keep_tournament_ids uuid[];
BEGIN
  SELECT coalesce(array_agg(id), ARRAY[]::uuid[]) INTO keep_venue_ids
  FROM public.venues
  WHERE deleted_at IS NULL
    AND lower(trim(name)) IN ('main field', 'joked field');

  IF cardinality(keep_venue_ids) < 2 THEN
    RAISE EXCEPTION
      'Expected both Main Field and Joked Field. Found % venue(s). Check names in PREVIEW.',
      cardinality(keep_venue_ids);
  END IF;

  -- Flexible match: "Inter-Faculty Pre-season", "inter-faculty preseason", etc.
  SELECT coalesce(array_agg(id), ARRAY[]::uuid[]) INTO keep_tournament_ids
  FROM public.tournaments
  WHERE regexp_replace(lower(name), '[^a-z0-9]+', '', 'g')
        LIKE '%interfaculty%preseason%';

  IF cardinality(keep_tournament_ids) = 0 THEN
    RAISE EXCEPTION
      'No competition matched Inter-Faculty Preseason. Check names in PREVIEW.';
  END IF;

  IF cardinality(keep_tournament_ids) > 1 THEN
    RAISE EXCEPTION
      'Matched % competitions for Preseason — rename duplicates or keep one.',
      cardinality(keep_tournament_ids);
  END IF;

  -- Soft-delete matches outside the kept competition
  UPDATE public.matches m
  SET deleted_at = now(), status = 'cancelled'
  WHERE m.deleted_at IS NULL
    AND (m.tournament_id IS NULL OR m.tournament_id <> ALL (keep_tournament_ids));

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

  DELETE FROM public.tournaments t
  WHERE t.id <> ALL (keep_tournament_ids);

  -- Soft-delete other venues only
  UPDATE public.venues v
  SET deleted_at = now(), is_active = false, updated_at = now()
  WHERE v.deleted_at IS NULL
    AND v.id <> ALL (keep_venue_ids);

  -- Mock discipline only — teams/players untouched
  DELETE FROM public.player_suspensions;
END $$;

COMMIT;

-- Expect: Main Field, Joked Field, one Preseason comp, all teams still active
SELECT 'venues' AS what, name FROM public.venues WHERE deleted_at IS NULL ORDER BY name;
SELECT 'teams' AS what, count(*) AS n FROM public.teams WHERE deleted_at IS NULL;
SELECT 'players' AS what, count(*) AS n FROM public.players;
SELECT 'tournaments' AS what, name FROM public.tournaments ORDER BY name;
SELECT count(*) AS active_matches FROM public.matches WHERE deleted_at IS NULL;
