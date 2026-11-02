-- AU Score — DESTRUCTIVE purge. Do NOT run until you approved the PREVIEW output.
-- DEFAULT SCOPE (safe-ish): wipe Friendlies match theatre + awards/suspensions/brackets for Friendlies.
-- KEEPS ALWAYS: venues, sports, departments, teams, players, player_sport_registry.
--
-- BEFORE RUNNING:
-- 1) Run score_purge_mock_PREVIEW.sql and review KEEP CANDIDATES.
-- 2) Paste real competition UUIDs (e.g. Inter-Faculty Pre-season) into keep_ids below.
--    With keep_ids set: soft-deletes matches NOT in that list + drops non-kept brackets/awards.
--    With keep_ids empty: only Friendlies matches/tournaments are scrubbed (safest default).
-- 3) Leave the AGGRESSIVE block commented unless you intentionally wipe ALL comps.

BEGIN;

-- 1) Always keep venues — no DELETE on venues.

-- 2) Clear match-linked theatre for competitions you are NOT keeping.
--    Edit this list: UUIDs of tournaments to KEEP (e.g. Inter-Faculty Pre-season).
--    Example: ARRAY['aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid]
DO $$
DECLARE
  keep_ids uuid[] := ARRAY[]::uuid[];  -- << PUT REAL TOURNAMENT IDS HERE
BEGIN
  -- Soft-delete matches not in keep list (and not already deleted)
  UPDATE public.matches m
  SET deleted_at = now(), status = 'cancelled'
  WHERE m.deleted_at IS NULL
    AND (
      cardinality(keep_ids) = 0
      OR m.tournament_id <> ALL (keep_ids)
    )
    -- Prefer only clearing Friendlies when keep_ids is empty:
    AND (
      cardinality(keep_ids) > 0
      OR EXISTS (
        SELECT 1 FROM public.tournaments t
        WHERE t.id = m.tournament_id
          AND (t.category = 'friendly' OR lower(t.name) = 'friendlies')
      )
    );

  -- Hard-delete events for soft-deleted matches
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

  -- Bracket / group theatre for non-kept tournaments
  IF cardinality(keep_ids) > 0 THEN
    DELETE FROM public.bracket_fixtures bf WHERE bf.tournament_id <> ALL (keep_ids);
    DELETE FROM public.group_standings gs
    USING public.tournament_groups tg
    WHERE gs.group_id = tg.id AND tg.tournament_id <> ALL (keep_ids);
    DELETE FROM public.tournament_groups tg WHERE tg.tournament_id <> ALL (keep_ids);
    DELETE FROM public.season_awards sa
    WHERE sa.tournament_id IS NOT NULL AND sa.tournament_id <> ALL (keep_ids);
  ELSE
    -- keep_ids empty: only scrub Friendlies brackets/awards
    DELETE FROM public.bracket_fixtures bf
    USING public.tournaments t
    WHERE bf.tournament_id = t.id
      AND (t.category = 'friendly' OR lower(t.name) = 'friendlies');
  END IF;

  DELETE FROM public.player_suspensions; -- mock discipline; recreate from live cards later

  -- Optional: drop Friendlies tournament shells (matches already soft-deleted)
  DELETE FROM public.tournaments t
  WHERE (t.category = 'friendly' OR lower(t.name) = 'friendlies')
    AND (
      cardinality(keep_ids) = 0
      OR t.id <> ALL (keep_ids)
    );
END $$;

-- 3) AGGRESSIVE (commented) — wipe ALL competitions/matches except venues/clubs/players.
-- Uncomment ONLY if you confirmed Pre-season and all real comps are disposable.
/*
DELETE FROM public.match_events;
DELETE FROM public.match_lineups;
DELETE FROM public.period_scores;
DELETE FROM public.set_scores;
DELETE FROM public.bracket_fixtures;
DELETE FROM public.group_standings;
DELETE FROM public.tournament_groups;
DELETE FROM public.tournament_rosters;
DELETE FROM public.tournament_teams;
DELETE FROM public.season_awards;
DELETE FROM public.player_suspensions;
UPDATE public.matches SET deleted_at = now(), status = 'cancelled' WHERE deleted_at IS NULL;
DELETE FROM public.tournaments;
*/

COMMIT;

-- Spot-check
SELECT count(*) AS active_matches FROM public.matches WHERE deleted_at IS NULL;
SELECT count(*) AS venues FROM public.venues WHERE deleted_at IS NULL;
SELECT id, name, category FROM public.tournaments ORDER BY created_at DESC;
