-- AU Score — sports + friendlies bootstrap (idempotent)
-- Run in the SAME Supabase project that au-score.vercel.app uses
-- (Vercel → Score project → Settings → Environment Variables → NEXT_PUBLIC_SUPABASE_URL).
--
-- Safe on a shared Digest + Score database: only touches Score tables.

ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read sports" ON public.sports;
CREATE POLICY "Public read sports" ON public.sports FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated insert sports" ON public.sports;
CREATE POLICY "Authenticated insert sports" ON public.sports
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated update sports" ON public.sports;
CREATE POLICY "Authenticated update sports" ON public.sports
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

INSERT INTO public.sports (name, type, score_type)
VALUES
  ('Football', 'team', 'points'),
  ('Basketball', 'team', 'points'),
  ('Lawn Tennis', 'individual', 'sets'),
  ('Volleyball', 'team', 'sets'),
  ('Track & Field', 'individual', 'time')
ON CONFLICT (name) DO NOTHING;

-- Keep older dump names readable by the app resolver
INSERT INTO public.sports (name, type, score_type)
VALUES
  ('Tennis', 'team', 'sets'),
  ('Track', 'individual', 'time'),
  ('Soccer', 'team', 'points')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.tournaments (name, sport_id, category, season, rules)
SELECT
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

SELECT id, name, type, score_type FROM public.sports ORDER BY name;
