-- =============================================================================
-- Platform roles + verification baseline
-- =============================================================================
-- Super admin: cross-app (profiles.is_super_admin)
-- Per-app admins: app_roles (campus | digest | score) — granted by super admin
-- Score privilege no longer follows Digest profiles.role = 'admin'
-- Everyone starts verification_level = 'soft' (L1); L2 IRL link is docs-only for now
-- =============================================================================

-- ─── Profiles: super admin + verification ───────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_level TEXT NOT NULL DEFAULT 'soft';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_verification_level_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_verification_level_check
  CHECK (verification_level IN ('soft', 'verified'));

COMMENT ON COLUMN public.profiles.is_super_admin IS
  'Cross-platform owner. Full Campus + Digest + Score admin. Prefer a single human.';
COMMENT ON COLUMN public.profiles.verification_level IS
  'soft = L1 (default for all accounts); verified = L2 IRL-linked student (future).';

-- Backfill super admins from legacy Score owner roles
UPDATE public.profiles p
SET is_super_admin = true
WHERE EXISTS (
  SELECT 1 FROM public.score_user_roles s
  WHERE s.user_id = p.id AND s.role IN ('platform_owner', 'super_admin')
);

-- ─── App roles (scalable per-platform membership) ───────────────────────────

CREATE TABLE IF NOT EXISTS public.app_roles (
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  app TEXT NOT NULL CHECK (app IN ('campus', 'digest', 'score')),
  role TEXT NOT NULL,
  granted_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, app),
  CONSTRAINT app_roles_role_coherent CHECK (
    (app = 'campus' AND role IN ('admin'))
    OR (app = 'digest' AND role IN ('admin'))
    OR (app = 'score' AND role IN ('admin', 'record_keeper'))
  )
);

CREATE INDEX IF NOT EXISTS app_roles_app_role_idx ON public.app_roles (app, role);

COMMENT ON TABLE public.app_roles IS
  'Per-app privilege. Super admin grants rows. Digest newsroom writer/editor stay on profiles.role.';

ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;

-- Seed Score admins from legacy tables
INSERT INTO public.app_roles (user_id, app, role, granted_by)
SELECT s.user_id, 'score', 'admin', s.assigned_by
FROM public.score_admins s
ON CONFLICT (user_id, app) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.app_roles (user_id, app, role, granted_by)
SELECT s.user_id, 'score',
  CASE WHEN s.role IN ('admin', 'super_admin', 'platform_owner') THEN 'admin' ELSE 'admin' END,
  s.assigned_by
FROM public.score_user_roles s
WHERE s.role IN ('admin', 'super_admin', 'platform_owner')
ON CONFLICT (user_id, app) DO NOTHING;

-- Digest platform admins (profiles.role admin) — does NOT grant Score
INSERT INTO public.app_roles (user_id, app, role)
SELECT p.id, 'digest', 'admin'
FROM public.profiles p
WHERE p.role::text = 'admin'
ON CONFLICT (user_id, app) DO NOTHING;

-- ─── Helpers ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION private.is_super_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE id = uid),
    false
  )
  OR EXISTS (
    SELECT 1 FROM public.score_user_roles
    WHERE user_id = uid AND role IN ('platform_owner', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION private.has_app_role(
  p_app text,
  p_role text DEFAULT 'admin',
  uid uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT private.is_super_admin(uid)
    OR EXISTS (
      SELECT 1 FROM public.app_roles
      WHERE user_id = uid
        AND app = p_app
        AND (
          role = p_role
          OR (p_role = 'admin' AND role = 'admin')
          OR (p_app = 'score' AND p_role = 'record_keeper' AND role IN ('admin', 'record_keeper'))
        )
    );
$$;

CREATE OR REPLACE FUNCTION private.is_platform_owner(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT private.is_super_admin(uid);
$$;

CREATE OR REPLACE FUNCTION private.is_score_super_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT private.is_super_admin(uid);
$$;

-- Score admin: super admin OR score app admin — NEVER Digest profiles.role
CREATE OR REPLACE FUNCTION private.is_score_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT private.is_super_admin(uid)
    OR private.has_app_role('score', 'admin', uid)
    OR EXISTS (
      SELECT 1 FROM public.score_admins WHERE user_id = uid
    )
    OR EXISTS (
      SELECT 1 FROM public.score_user_roles
      WHERE user_id = uid AND role IN ('admin', 'super_admin', 'platform_owner')
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
    OR private.has_app_role('score', 'record_keeper', uid);
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

-- Digest staff helper: newsroom ladder OR digest app admin OR super admin
CREATE OR REPLACE FUNCTION private.is_digest_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT private.is_super_admin(uid)
    OR private.has_app_role('digest', 'admin', uid)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = uid AND role::text = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION private.is_campus_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT private.is_super_admin(uid)
    OR private.has_app_role('campus', 'admin', uid);
$$;

-- Super-admin-only grant (callable from SQL editor / future admin UI via service role)
CREATE OR REPLACE FUNCTION public.grant_app_role(
  target_user_id uuid,
  p_app text,
  p_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admin can grant app roles';
  END IF;
  IF p_app NOT IN ('campus', 'digest', 'score') THEN
    RAISE EXCEPTION 'Invalid app';
  END IF;
  INSERT INTO public.app_roles (user_id, app, role, granted_by)
  VALUES (target_user_id, p_app, p_role, auth.uid())
  ON CONFLICT (user_id, app) DO UPDATE
    SET role = EXCLUDED.role,
        granted_by = EXCLUDED.granted_by;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_app_role(
  target_user_id uuid,
  p_app text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT private.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admin can revoke app roles';
  END IF;
  DELETE FROM public.app_roles
  WHERE user_id = target_user_id AND app = p_app;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_app_role(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_app_role(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_app_role(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_app_role(uuid, text) TO authenticated;

-- ─── RLS: app_roles ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "app_roles: read own or staff" ON public.app_roles;
CREATE POLICY "app_roles: read own or staff"
  ON public.app_roles FOR SELECT
  USING (
    private.is_super_admin()
    OR user_id = auth.uid()
    OR (app = 'score' AND private.is_score_admin())
    OR (app = 'digest' AND private.is_digest_admin())
    OR (app = 'campus' AND private.is_campus_admin())
  );

DROP POLICY IF EXISTS "app_roles: super admin manage" ON public.app_roles;
CREATE POLICY "app_roles: super admin manage"
  ON public.app_roles FOR ALL
  USING (private.is_super_admin())
  WITH CHECK (private.is_super_admin());

-- Align legacy score_user_roles manage with super admin
DROP POLICY IF EXISTS "score_user_roles: owner manage" ON public.score_user_roles;
CREATE POLICY "score_user_roles: owner manage"
  ON public.score_user_roles FOR ALL
  USING (private.is_super_admin())
  WITH CHECK (private.is_super_admin());

DROP POLICY IF EXISTS "score_admins: super admin manage" ON public.score_admins;
CREATE POLICY "score_admins: super admin manage"
  ON public.score_admins FOR ALL
  USING (private.is_super_admin())
  WITH CHECK (private.is_super_admin());

-- ─── Phantom: authenticated create; owner/staff update ──────────────────────

DROP POLICY IF EXISTS "phantom: anyone insert" ON public.phantom_sessions;
CREATE POLICY "phantom: authenticated insert"
  ON public.phantom_sessions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

DROP POLICY IF EXISTS "phantom: owner update" ON public.phantom_sessions;
CREATE POLICY "phantom: owner or staff update"
  ON public.phantom_sessions FOR UPDATE
  USING (
    created_by = auth.uid()
    OR private.can_manage_matches()
  )
  WITH CHECK (
    created_by = auth.uid()
    OR private.can_manage_matches()
  );

-- ─── Storage: Score media — staff only ──────────────────────────────────────

DROP POLICY IF EXISTS "club-logos: authenticated upload" ON storage.objects;
CREATE POLICY "club-logos: staff upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'club-logos' AND private.is_score_admin());

DROP POLICY IF EXISTS "player-avatars: authenticated upload" ON storage.objects;
CREATE POLICY "player-avatars: staff upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'player-avatars' AND private.is_score_admin());
