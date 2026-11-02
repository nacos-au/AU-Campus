-- AU Score — PREVIEW only (read-only). Run this first in Supabase SQL editor.
-- Shows what a purge would touch. Venues are NEVER listed for deletion.
-- Do NOT run score_purge_mock_APPLY.sql until you paste keep_ids and approve.

-- ── KEEP (locations / IRL venues) ───────────────────────────────────────────
SELECT 'KEEP venues' AS bucket, id, name, location, sport_slug, deleted_at
FROM public.venues
WHERE deleted_at IS NULL
ORDER BY name;

-- ── Competitions inventory ──────────────────────────────────────────────────

-- Seed “Friendlies” shells (one per sport) — default APPLY soft-clears these
SELECT 'FRIENDLY tournaments' AS bucket, id, name, category, season, created_at
FROM public.tournaments
WHERE category = 'friendly' OR lower(name) = 'friendlies'
ORDER BY created_at;

-- Real comps you likely want to KEEP (copy id → keep_ids in APPLY)
SELECT 'KEEP CANDIDATES' AS bucket, id, name, category,
       COALESCE(competition_type::text, '') AS competition_type,
       season, created_at,
       (SELECT count(*) FROM public.matches m WHERE m.tournament_id = t.id AND m.deleted_at IS NULL) AS match_count
FROM public.tournaments t
WHERE NOT (category = 'friendly' OR lower(name) = 'friendlies')
ORDER BY created_at DESC;

-- All competitions (sanity)
SELECT 'ALL tournaments' AS bucket, id, name, category, season, created_at
FROM public.tournaments
ORDER BY created_at DESC;

-- ── Match theatre (default APPLY soft-deletes Friendlies matches only
--    unless keep_ids is set, then soft-deletes everything NOT in keep_ids) ──
SELECT 'matches' AS bucket, m.id, m.status, m.scheduled_at, m.scope,
       ht.name AS home, at.name AS away, t.name AS competition, t.category
FROM public.matches m
LEFT JOIN public.teams ht ON ht.id = m.home_team_id
LEFT JOIN public.teams at ON at.id = m.away_team_id
LEFT JOIN public.tournaments t ON t.id = m.tournament_id
WHERE m.deleted_at IS NULL
ORDER BY m.scheduled_at DESC
LIMIT 150;

-- Linked counts
SELECT 'match_events' AS bucket, count(*) AS n FROM public.match_events;
SELECT 'match_lineups' AS bucket, count(*) AS n FROM public.match_lineups;
SELECT 'bracket_fixtures' AS bucket, count(*) AS n FROM public.bracket_fixtures;
SELECT 'group_standings' AS bucket, count(*) AS n FROM public.group_standings;
SELECT 'season_awards' AS bucket, count(*) AS n FROM public.season_awards;
SELECT 'player_suspensions' AS bucket, count(*) AS n FROM public.player_suspensions;

-- Clubs / players — NOT deleted by default APPLY (venues + clubs + players kept)
SELECT 'teams (KEEP by default)' AS bucket, id, name, is_guest, deleted_at
FROM public.teams
WHERE deleted_at IS NULL
ORDER BY name;
SELECT 'players' AS bucket, count(*) AS n FROM public.players;
SELECT 'player_sport_registry' AS bucket, count(*) AS n FROM public.player_sport_registry;
SELECT 'tournament_rosters' AS bucket, count(*) AS n
FROM public.tournament_rosters
WHERE to_regclass('public.tournament_rosters') IS NOT NULL;

-- Sports rows (KEEP)
SELECT 'sports (KEEP)' AS bucket, id, name FROM public.sports ORDER BY name;
