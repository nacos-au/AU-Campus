-- AU Score — PREVIEW only (read-only). Pick IDs for APPLY keep lists.
-- Goal: keep N teams + 2 venues + 1 competition; purge the rest.

-- 1) Copy 2 venue ids you want to KEEP
SELECT 'venues → pick 2' AS pick, id, name, location, sport_slug
FROM public.venues
WHERE deleted_at IS NULL
ORDER BY name;

-- 2) Copy team ids you want to KEEP
SELECT 'teams → pick keepers' AS pick, id, name, is_guest, sport_id
FROM public.teams
WHERE deleted_at IS NULL
ORDER BY name;

-- 3) Copy the ONE competition id to KEEP
SELECT 'competitions → pick 1' AS pick, id, name, category,
       COALESCE(competition_type::text, '') AS competition_type, season,
       (SELECT count(*) FROM public.matches m
        WHERE m.tournament_id = t.id AND m.deleted_at IS NULL) AS match_count
FROM public.tournaments t
ORDER BY created_at DESC;

-- Sanity: what would disappear once keep lists are filled
SELECT 'venues (all active)' AS bucket, count(*) AS n FROM public.venues WHERE deleted_at IS NULL;
SELECT 'teams (all active)' AS bucket, count(*) AS n FROM public.teams WHERE deleted_at IS NULL;
SELECT 'tournaments' AS bucket, count(*) AS n FROM public.tournaments;
SELECT 'active matches' AS bucket, count(*) AS n FROM public.matches WHERE deleted_at IS NULL;
