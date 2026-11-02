-- AU Score — Sprint 2 live ops (idempotent)
-- Per-match ET/pens, draft competitions, lineup helpers.

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS allows_extra_time BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allows_penalty_shootout BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lineup_image_url TEXT;

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false;

-- Spot-check
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'matches'
  AND column_name IN ('allows_extra_time', 'allows_penalty_shootout', 'lineup_image_url');
