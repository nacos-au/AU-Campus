-- =============================================================================
-- AUSA Interfaculty Football League — set venue to Main Field for all fixtures
-- Idempotent. Paste into Supabase SQL editor.
-- =============================================================================

-- Ensure coach_name on match lineup sheets (used by admin/keeper DnD builder)
ALTER TABLE public.match_lineups
  ADD COLUMN IF NOT EXISTS coach_name TEXT;

INSERT INTO public.venues (name, location)
SELECT 'Main Field', 'Achievers University, Owo'
WHERE NOT EXISTS (
  SELECT 1 FROM public.venues v
  WHERE lower(v.name) = 'main field' AND v.deleted_at IS NULL
);

UPDATE public.matches m
SET venue_id = v.id
FROM public.venues v
JOIN public.tournaments t ON t.name = 'AUSA Interfaculty Football League'
WHERE lower(v.name) = 'main field'
  AND v.deleted_at IS NULL
  AND m.tournament_id = t.id;

-- Verification
SELECT
  count(*) FILTER (WHERE m.venue_id = v.id) AS with_main_field,
  count(*) AS total_ausa_matches
FROM public.matches m
JOIN public.tournaments t ON t.id = m.tournament_id
CROSS JOIN public.venues v
WHERE t.name = 'AUSA Interfaculty Football League'
  AND lower(v.name) = 'main field'
  AND v.deleted_at IS NULL;
