-- Read-only picker. Use short NAMES in APPLY — not UUIDs.

SELECT 'venues' AS kind, name, location, sport_slug
FROM public.venues WHERE deleted_at IS NULL ORDER BY name;

SELECT 'teams' AS kind, name, is_guest
FROM public.teams WHERE deleted_at IS NULL ORDER BY name;

SELECT 'competitions' AS kind, name, category, season, created_at
FROM public.tournaments ORDER BY created_at DESC;

SELECT 'recent (last 14d)' AS kind,
  (SELECT count(*) FROM public.venues WHERE deleted_at IS NULL AND created_at > now() - interval '14 days') AS venues,
  (SELECT count(*) FROM public.teams WHERE deleted_at IS NULL AND created_at > now() - interval '14 days') AS teams,
  (SELECT count(*) FROM public.tournaments WHERE created_at > now() - interval '14 days') AS comps;
