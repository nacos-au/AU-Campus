-- Pre-match lineup sheet image (simple graphic / photo before kick-off)
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS lineup_image_url TEXT;
