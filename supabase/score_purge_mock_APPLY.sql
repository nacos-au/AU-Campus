-- AU Score purge — pick ONE mode. No UUID pasting.
--
-- mode:
--   'names'   → keep venues/teams/comp matched by name (edit arrays below)
--   'recent'  → keep anything created in the last N days; soft-delete older junk
--   'scratch' → wipe score theatre (matches/comps/teams/venues soft or hard);
--               keeps sports + departments so you can rebuild clean
--
-- Still destructive. Run PREVIEW first. Confirm before running.

BEGIN;

DO $$
DECLARE
  mode text := 'recent';          -- << 'names' | 'recent' | 'scratch'
  recent_days int := 14;          -- used when mode = 'recent'

  -- used when mode = 'names' (case-insensitive, exact name match)
  keep_venue_names text[] := ARRAY[
    -- 'Main Football Pitch',
    -- 'Indoor Court'
  ];
  keep_team_names text[] := ARRAY[
    -- 'Faculty of Law',
    -- 'Engineering'
  ];
  keep_competition_name text := '';  -- e.g. 'Inter-Faculty Pre-season'

  keep_venue_ids uuid[];
  keep_team_ids uuid[];
  keep_tournament_ids uuid[];
BEGIN
  IF mode = 'scratch' THEN
    DELETE FROM public.match_events;
    DELETE FROM public.match_lineups;
    DELETE FROM public.period_scores;
    DELETE FROM public.set_scores;
    DELETE FROM public.bracket_fixtures;
    DELETE FROM public.group_standings;
    DELETE FROM public.tournament_groups;
    IF to_regclass('public.tournament_rosters') IS NOT NULL THEN
      DELETE FROM public.tournament_rosters;
    END IF;
    DELETE FROM public.tournament_teams;
    DELETE FROM public.season_awards;
    DELETE FROM public.player_suspensions;
    DELETE FROM public.player_sport_registry;
    UPDATE public.matches SET deleted_at = now(), status = 'cancelled' WHERE deleted_at IS NULL;
    DELETE FROM public.tournaments;
    UPDATE public.teams SET deleted_at = now() WHERE deleted_at IS NULL;
    UPDATE public.venues SET deleted_at = now(), is_active = false, updated_at = now()
      WHERE deleted_at IS NULL;
    -- sports + departments left intact
    RETURN;
  END IF;

  IF mode = 'recent' THEN
    SELECT coalesce(array_agg(id), ARRAY[]::uuid[]) INTO keep_venue_ids
    FROM public.venues
    WHERE deleted_at IS NULL AND created_at > now() - make_interval(days => recent_days);

    SELECT coalesce(array_agg(id), ARRAY[]::uuid[]) INTO keep_team_ids
    FROM public.teams
    WHERE deleted_at IS NULL AND created_at > now() - make_interval(days => recent_days);

    SELECT coalesce(array_agg(id), ARRAY[]::uuid[]) INTO keep_tournament_ids
    FROM public.tournaments
    WHERE created_at > now() - make_interval(days => recent_days);

  ELSIF mode = 'names' THEN
    IF cardinality(keep_venue_names) = 0
       OR cardinality(keep_team_names) = 0
       OR length(trim(keep_competition_name)) = 0 THEN
      RAISE EXCEPTION 'mode=names requires keep_venue_names, keep_team_names, keep_competition_name';
    END IF;

    SELECT coalesce(array_agg(id), ARRAY[]::uuid[]) INTO keep_venue_ids
    FROM public.venues
    WHERE deleted_at IS NULL
      AND lower(name) IN (SELECT lower(x) FROM unnest(keep_venue_names) AS x);

    SELECT coalesce(array_agg(id), ARRAY[]::uuid[]) INTO keep_team_ids
    FROM public.teams
    WHERE deleted_at IS NULL
      AND lower(name) IN (SELECT lower(x) FROM unnest(keep_team_names) AS x);

    SELECT coalesce(array_agg(id), ARRAY[]::uuid[]) INTO keep_tournament_ids
    FROM public.tournaments
    WHERE lower(name) = lower(trim(keep_competition_name));

    IF cardinality(keep_venue_ids) = 0 THEN
      RAISE EXCEPTION 'No venues matched keep_venue_names';
    END IF;
    IF cardinality(keep_team_ids) = 0 THEN
      RAISE EXCEPTION 'No teams matched keep_team_names';
    END IF;
    IF cardinality(keep_tournament_ids) = 0 THEN
      RAISE EXCEPTION 'No competition matched keep_competition_name=%', keep_competition_name;
    END IF;

  ELSE
    RAISE EXCEPTION 'Unknown mode=% — use names, recent, or scratch', mode;
  END IF;

  -- Soft-delete matches outside kept comps (also orphan/null tournament matches)
  UPDATE public.matches m
  SET deleted_at = now(), status = 'cancelled'
  WHERE m.deleted_at IS NULL
    AND (
      cardinality(keep_tournament_ids) = 0
      OR m.tournament_id IS NULL
      OR m.tournament_id <> ALL (keep_tournament_ids)
    );

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

  IF cardinality(keep_tournament_ids) > 0 THEN
    DELETE FROM public.bracket_fixtures bf WHERE bf.tournament_id <> ALL (keep_tournament_ids);
    DELETE FROM public.group_standings gs
    USING public.tournament_groups tg
    WHERE gs.group_id = tg.id AND tg.tournament_id <> ALL (keep_tournament_ids);
    DELETE FROM public.tournament_groups tg WHERE tg.tournament_id <> ALL (keep_tournament_ids);
    DELETE FROM public.season_awards sa
    WHERE sa.tournament_id IS NOT NULL AND sa.tournament_id <> ALL (keep_tournament_ids);
    IF to_regclass('public.tournament_rosters') IS NOT NULL THEN
      DELETE FROM public.tournament_rosters tr WHERE tr.tournament_id <> ALL (keep_tournament_ids);
    END IF;
    DELETE FROM public.tournament_teams tt WHERE tt.tournament_id <> ALL (keep_tournament_ids);
    DELETE FROM public.tournaments t WHERE t.id <> ALL (keep_tournament_ids);
  ELSE
    -- recent mode with nothing recent: wipe all comps
    DELETE FROM public.bracket_fixtures;
    DELETE FROM public.group_standings;
    DELETE FROM public.tournament_groups;
    IF to_regclass('public.tournament_rosters') IS NOT NULL THEN
      DELETE FROM public.tournament_rosters;
    END IF;
    DELETE FROM public.tournament_teams;
    DELETE FROM public.season_awards;
    DELETE FROM public.tournaments;
  END IF;

  UPDATE public.venues v
  SET deleted_at = now(), is_active = false, updated_at = now()
  WHERE v.deleted_at IS NULL
    AND (cardinality(keep_venue_ids) = 0 OR v.id <> ALL (keep_venue_ids));

  UPDATE public.teams t
  SET deleted_at = now()
  WHERE t.deleted_at IS NULL
    AND (cardinality(keep_team_ids) = 0 OR t.id <> ALL (keep_team_ids));

  DELETE FROM public.player_sport_registry r
  USING public.teams t
  WHERE r.team_id = t.id AND t.deleted_at IS NOT NULL;

  DELETE FROM public.player_suspensions;
END $$;

COMMIT;

SELECT 'venues' AS what, name FROM public.venues WHERE deleted_at IS NULL ORDER BY name;
SELECT 'teams' AS what, name FROM public.teams WHERE deleted_at IS NULL ORDER BY name;
SELECT 'tournaments' AS what, name FROM public.tournaments ORDER BY name;
SELECT count(*) AS active_matches FROM public.matches WHERE deleted_at IS NULL;
