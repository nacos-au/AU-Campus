-- AU Score: Phantom — branded free-play sessions (persistent + shareable)

CREATE TABLE IF NOT EXISTS public.phantom_sessions (
  id TEXT PRIMARY KEY,
  code VARCHAR(12) NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('setup', 'live', 'completed')),
  settings JSONB NOT NULL,
  matches JSONB NOT NULL DEFAULT '[]'::jsonb,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  standings JSONB NOT NULL DEFAULT '[]'::jsonb,
  active_match_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  concluded_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS phantom_sessions_code_idx ON public.phantom_sessions (code);
CREATE INDEX IF NOT EXISTS phantom_sessions_status_idx ON public.phantom_sessions (status)
  WHERE deleted_at IS NULL;

ALTER TABLE public.phantom_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "phantom: public read completed" ON public.phantom_sessions;
CREATE POLICY "phantom: public read completed"
  ON public.phantom_sessions FOR SELECT
  USING (deleted_at IS NULL AND (status = 'completed' OR created_by = auth.uid() OR auth.uid() IS NOT NULL));

DROP POLICY IF EXISTS "phantom: anyone insert" ON public.phantom_sessions;
CREATE POLICY "phantom: anyone insert"
  ON public.phantom_sessions FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "phantom: owner update" ON public.phantom_sessions;
CREATE POLICY "phantom: owner update"
  ON public.phantom_sessions FOR UPDATE
  USING (created_by = auth.uid() OR created_by IS NULL OR private.can_manage_matches())
  WITH CHECK (created_by = auth.uid() OR created_by IS NULL OR private.can_manage_matches());
