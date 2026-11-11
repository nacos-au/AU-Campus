-- Live match clock published for spectators (run in Supabase SQL editor).

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS clock_elapsed_seconds INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clock_is_running BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS clock_is_time_lost BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS clock_running_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clock_stoppage_seconds INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clock_boarded_stoppage_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clock_time_lost_started_at TIMESTAMPTZ;
