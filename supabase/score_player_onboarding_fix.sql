-- AU Score — player onboarding fixes (idempotent)
-- Run on https://nyorzykgpocnfapffkph.supabase.co (same project as Score Vercel env)

-- Wider position fields for multi-select (e.g. "Goalkeeper, Defender, Midfielder")
ALTER TABLE public.players
  ALTER COLUMN position TYPE TEXT;

ALTER TABLE public.player_sport_registry
  ALTER COLUMN squad_role TYPE VARCHAR(80);

-- Squad list was empty when registry lacked public read / admin write
ALTER TABLE public.player_sport_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read player_sport_registry" ON public.player_sport_registry;
CREATE POLICY "Public read player_sport_registry"
  ON public.player_sport_registry FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage player_sport_registry" ON public.player_sport_registry;
CREATE POLICY "Admins manage player_sport_registry"
  ON public.player_sport_registry FOR ALL
  USING (private.is_score_admin())
  WITH CHECK (private.is_score_admin());

-- Spot-check
SELECT count(*) AS registry_rows FROM public.player_sport_registry;
SELECT id, first_name, last_name, matric_number, position FROM public.players ORDER BY created_at DESC LIMIT 10;
