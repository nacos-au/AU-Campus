-- Keeper calendar events + assignment by event (not open match access)

CREATE TABLE IF NOT EXISTS public.keeper_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS keeper_events_scheduled_idx
  ON public.keeper_events (scheduled_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS keeper_events_sport_idx
  ON public.keeper_events (sport_slug)
  WHERE deleted_at IS NULL;

-- Prefer event-based assignments; keep match_id column for legacy rows
ALTER TABLE public.record_keeper_assignments
  ADD COLUMN IF NOT EXISTS keeper_event_id UUID REFERENCES public.keeper_events(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Allow match_id to be null when using event assignment
ALTER TABLE public.record_keeper_assignments
  ALTER COLUMN match_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS record_keeper_assignments_user_event_unique
  ON public.record_keeper_assignments (user_id, keeper_event_id)
  WHERE keeper_event_id IS NOT NULL;

ALTER TABLE public.keeper_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read keeper_events" ON public.keeper_events;
CREATE POLICY "Public read keeper_events" ON public.keeper_events
  FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Staff manage keeper_events" ON public.keeper_events;
CREATE POLICY "Staff manage keeper_events" ON public.keeper_events
  FOR ALL USING (
    private.is_super_admin(auth.uid())
    OR private.has_app_role('score', 'admin', auth.uid())
  )
  WITH CHECK (
    private.is_super_admin(auth.uid())
    OR private.has_app_role('score', 'admin', auth.uid())
  );

DROP POLICY IF EXISTS "Keepers read own assignments" ON public.record_keeper_assignments;
CREATE POLICY "Keepers read own assignments" ON public.record_keeper_assignments
  FOR SELECT USING (
    user_id = auth.uid()
    OR private.is_super_admin(auth.uid())
    OR private.has_app_role('score', 'admin', auth.uid())
  );

DROP POLICY IF EXISTS "Admins manage assignments" ON public.record_keeper_assignments;
CREATE POLICY "Admins manage assignments" ON public.record_keeper_assignments
  FOR ALL USING (
    private.is_super_admin(auth.uid())
    OR private.has_app_role('score', 'admin', auth.uid())
  )
  WITH CHECK (
    private.is_super_admin(auth.uid())
    OR private.has_app_role('score', 'admin', auth.uid())
  );
