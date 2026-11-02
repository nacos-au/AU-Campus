-- Read-only check before APPLY (your keep list).

SELECT 'venues (will KEEP if named Main Field / Joked Field)' AS note, name, location
FROM public.venues WHERE deleted_at IS NULL ORDER BY name;

SELECT 'competition match?' AS note, id, name, category, season
FROM public.tournaments
WHERE regexp_replace(lower(name), '[^a-z0-9]+', '', 'g')
      LIKE '%interfaculty%preseason%';

SELECT 'other comps (will DELETE)' AS note, name, category, created_at
FROM public.tournaments
WHERE regexp_replace(lower(name), '[^a-z0-9]+', '', 'g')
      NOT LIKE '%interfaculty%preseason%'
ORDER BY created_at DESC;

SELECT 'teams (KEEP ALL)' AS note, count(*) AS n FROM public.teams WHERE deleted_at IS NULL;
SELECT 'players (KEEP ALL)' AS note, count(*) AS n FROM public.players;
