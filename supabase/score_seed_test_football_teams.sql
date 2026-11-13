-- Idempotent: Test United + Test Athletic guest football sides with crest logos.
-- Prefer Admin → Clubs → "Seed football test sides" for full 14-player pools.
-- This SQL only ensures the two crest-backed guest teams exist for fixture picks.

DO $$
DECLARE
  sport_uuid uuid;
  team_united uuid;
  team_athletic uuid;
BEGIN
  SELECT id INTO sport_uuid FROM public.sports WHERE name IN ('Football', 'Soccer') LIMIT 1;
  IF sport_uuid IS NULL THEN
    RAISE EXCEPTION 'Football sport row missing — run score sports seed first';
  END IF;

  SELECT id INTO team_united
  FROM public.teams
  WHERE is_guest = true AND deleted_at IS NULL AND lower(name) = lower('Test United') AND sport_id = sport_uuid
  LIMIT 1;

  IF team_united IS NULL THEN
    INSERT INTO public.teams (name, sport_id, department_id, is_guest, institution, logo_url)
    VALUES ('Test United', sport_uuid, NULL, true, 'AU Score Lab', '/logos/test-united.svg')
    RETURNING id INTO team_united;
  ELSE
    UPDATE public.teams
    SET logo_url = '/logos/test-united.svg', institution = 'AU Score Lab'
    WHERE id = team_united;
  END IF;

  SELECT id INTO team_athletic
  FROM public.teams
  WHERE is_guest = true AND deleted_at IS NULL AND lower(name) = lower('Test Athletic') AND sport_id = sport_uuid
  LIMIT 1;

  IF team_athletic IS NULL THEN
    INSERT INTO public.teams (name, sport_id, department_id, is_guest, institution, logo_url)
    VALUES ('Test Athletic', sport_uuid, NULL, true, 'AU Score Lab', '/logos/test-athletic.svg')
    RETURNING id INTO team_athletic;
  ELSE
    UPDATE public.teams
    SET logo_url = '/logos/test-athletic.svg', institution = 'AU Score Lab'
    WHERE id = team_athletic;
  END IF;

  RAISE NOTICE 'Seeded Test United (%) and Test Athletic (%)', team_united, team_athletic;
END $$;
