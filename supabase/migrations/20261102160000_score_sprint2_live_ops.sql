ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS allows_extra_time BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allows_penalty_shootout BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lineup_image_url TEXT;

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false;
