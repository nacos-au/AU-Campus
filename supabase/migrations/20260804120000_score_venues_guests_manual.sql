-- AU Score: venues (soft-delete presets), guest teams, match venue/scope, staff helpers
-- Production path for admin + record-keeper manual results and official match locations.

-- ─── Venues (admin-managed presets; soft-delete preserves historical matches) ─

CREATE TABLE IF NOT EXISTS public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  location VARCHAR(200) NOT NULL DEFAULT 'Achievers University, Owo',
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS venues_name_active_key
  ON public.venues (lower(name))
  WHERE deleted_at IS NULL;

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- ─── Guest teams ────────────────────────────────────────────────────────────

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS is_guest BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS institution TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.teams
  ALTER COLUMN department_id DROP NOT NULL;

DROP INDEX IF EXISTS teams_department_id_sport_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS teams_department_sport_active_key
  ON public.teams (department_id, sport_id)
  WHERE department_id IS NOT NULL AND deleted_at IS NULL AND is_guest = false;

CREATE UNIQUE INDEX IF NOT EXISTS teams_guest_name_sport_active_key
  ON public.teams (lower(name), sport_id)
  WHERE is_guest = true AND deleted_at IS NULL;

-- ─── Match venue + scope ────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE match_scope AS ENUM ('official', 'pickup');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scope match_scope NOT NULL DEFAULT 'official',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS matches_venue_id_idx ON public.matches (venue_id);
CREATE INDEX IF NOT EXISTS matches_scope_idx ON public.matches (scope);

-- Friendly tournament per sport for manually posted results
INSERT INTO public.tournaments (id, name, sport_id, category, season, rules)
SELECT
  gen_random_uuid(),
  'Friendlies',
  s.id,
  'friendly',
  '2025/26',
  '{}'::jsonb
FROM public.sports s
WHERE NOT EXISTS (
  SELECT 1 FROM public.tournaments t
  WHERE t.sport_id = s.id AND t.category = 'friendly' AND t.name = 'Friendlies'
);

-- Seed default venues (idempotent by name)
INSERT INTO public.venues (name, location)
SELECT v.name, v.location
FROM (VALUES
  ('Joked Field', 'Achievers University, Owo'),
  ('Main Field', 'Achievers University, Owo'),
  ('Main Court', 'Achievers University, Owo'),
  ('Indoor Hall', 'Achievers University, Owo'),
  ('Tennis Courts', 'Achievers University, Owo'),
  ('Main Track', 'Achievers University, Owo')
) AS v(name, location)
WHERE NOT EXISTS (
  SELECT 1 FROM public.venues existing
  WHERE lower(existing.name) = lower(v.name) AND existing.deleted_at IS NULL
);

-- ─── Staff helpers ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION private.is_score_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT private.is_score_super_admin(uid)
    OR EXISTS (
      SELECT 1 FROM public.score_user_roles
      WHERE user_id = uid AND role IN ('admin', 'super_admin', 'platform_owner')
    )
    OR EXISTS (
      SELECT 1 FROM public.score_admins WHERE user_id = uid
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = uid AND role::text IN ('super_admin', 'admin')
    );
$$;

CREATE OR REPLACE FUNCTION private.is_record_keeper(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT private.is_score_admin(uid)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = uid AND role::text IN ('record_keeper', 'super_admin')
    );
$$;

CREATE OR REPLACE FUNCTION private.can_manage_matches(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT private.is_score_admin(uid) OR private.is_record_keeper(uid);
$$;

-- Venues: public read; admin manage
DROP POLICY IF EXISTS "venues: public read" ON public.venues;
CREATE POLICY "venues: public read"
  ON public.venues FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "venues: admin insert" ON public.venues;
CREATE POLICY "venues: admin insert"
  ON public.venues FOR INSERT
  WITH CHECK (private.is_score_admin());

DROP POLICY IF EXISTS "venues: admin update" ON public.venues;
CREATE POLICY "venues: admin update"
  ON public.venues FOR UPDATE
  USING (private.is_score_admin())
  WITH CHECK (private.is_score_admin());

-- Match staff can create/update matches (manual results + venue)
DROP POLICY IF EXISTS "matches: staff insert" ON public.matches;
CREATE POLICY "matches: staff insert"
  ON public.matches FOR INSERT
  WITH CHECK (private.can_manage_matches());

DROP POLICY IF EXISTS "matches: staff update" ON public.matches;
CREATE POLICY "matches: staff update"
  ON public.matches FOR UPDATE
  USING (private.can_manage_matches())
  WITH CHECK (private.can_manage_matches());
