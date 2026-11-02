-- Staff write access for KO advance + suspension clear (run in Supabase SQL editor).

ALTER TABLE public.player_suspensions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read player_suspensions" ON public.player_suspensions;
CREATE POLICY "Public read player_suspensions" ON public.player_suspensions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage player_suspensions" ON public.player_suspensions;
CREATE POLICY "Admins manage player_suspensions" ON public.player_suspensions
  FOR ALL USING (private.is_score_admin()) WITH CHECK (private.is_score_admin());

DROP POLICY IF EXISTS "Staff manage bracket_fixtures" ON public.bracket_fixtures;
CREATE POLICY "Staff manage bracket_fixtures" ON public.bracket_fixtures
  FOR ALL USING (private.can_manage_matches()) WITH CHECK (private.can_manage_matches());
