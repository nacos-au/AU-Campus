-- First / last name on shared profiles (Campus signup)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;

UPDATE public.profiles
SET
  first_name = COALESCE(
    NULLIF(first_name, ''),
    NULLIF(split_part(trim(display_name), ' ', 1), ''),
    split_part(COALESCE(email, 'user'), '@', 1)
  ),
  last_name = COALESCE(
    NULLIF(last_name, ''),
    NULLIF(trim(substring(trim(display_name) from length(split_part(trim(display_name), ' ', 1)) + 1)), ''),
    ''
  )
WHERE display_name IS NOT NULL AND trim(display_name) <> '';

-- Signup trigger: store first/last from auth metadata
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  meta_username text;
  meta_first text;
  meta_last text;
  meta_display text;
BEGIN
  meta_username := lower(nullif(trim(NEW.raw_user_meta_data->>'username'), ''));
  meta_first := nullif(trim(NEW.raw_user_meta_data->>'first_name'), '');
  meta_last := nullif(trim(NEW.raw_user_meta_data->>'last_name'), '');
  meta_display := COALESCE(
    nullif(trim(NEW.raw_user_meta_data->>'display_name'), ''),
    nullif(trim(concat_ws(' ', meta_first, meta_last)), ''),
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, display_name, email, full_name, username, first_name, last_name)
  VALUES (
    NEW.id,
    meta_display,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', meta_display, NEW.email),
    meta_username,
    meta_first,
    meta_last
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    display_name = COALESCE(NULLIF(public.profiles.display_name, ''), EXCLUDED.display_name),
    username = COALESCE(public.profiles.username, EXCLUDED.username),
    first_name = COALESCE(public.profiles.first_name, EXCLUDED.first_name),
    last_name = COALESCE(public.profiles.last_name, EXCLUDED.last_name);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN private.handle_new_user();
END;
$$;

-- Sport-scoped venues
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS sport_slug TEXT;

CREATE INDEX IF NOT EXISTS venues_sport_slug_idx ON public.venues (sport_slug)
  WHERE deleted_at IS NULL;

-- Retire old generic seeds (unique on lower(name))
UPDATE public.venues
SET deleted_at = now()
WHERE deleted_at IS NULL
  AND lower(name) IN (
    'joked field', 'main field', 'court', 'hall', 'tennis court', 'track',
    'achievers main field', 'basketball court a', 'basketball court b',
    'tennis court a', 'tennis court b', 'achievers main field track',
    'volleyball court a', 'volleyball court b'
  );

INSERT INTO public.venues (name, location, sport_slug)
SELECT v.name, v.location, v.sport_slug
FROM (VALUES
  ('Achievers Main Field', 'Main campus', 'football'),
  ('Joked Field', 'Campus grounds', 'football'),
  ('Basketball Court A', 'Indoor courts', 'basketball'),
  ('Basketball Court B', 'Indoor courts', 'basketball'),
  ('Tennis Court A', 'Tennis complex', 'tennis'),
  ('Tennis Court B', 'Tennis complex', 'tennis'),
  ('Achievers Main Field Track', 'Athletics', 'track'),
  ('Volleyball Court A', 'Indoor courts', 'volleyball'),
  ('Volleyball Court B', 'Indoor courts', 'volleyball')
) AS v(name, location, sport_slug)
WHERE NOT EXISTS (
  SELECT 1 FROM public.venues x
  WHERE lower(x.name) = lower(v.name) AND x.deleted_at IS NULL
);
