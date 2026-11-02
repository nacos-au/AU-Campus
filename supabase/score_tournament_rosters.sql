-- AU Score — competition squads (idempotent)
-- Run on the shared Score/Digest Supabase project after deploying the app.

CREATE TABLE IF NOT EXISTS public.tournament_rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  jersey_number INTEGER,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, player_id),
  UNIQUE (tournament_id, team_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_rosters_tournament
  ON public.tournament_rosters(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_rosters_team
  ON public.tournament_rosters(tournament_id, team_id);

ALTER TABLE public.tournament_teams
  ADD COLUMN IF NOT EXISTS roster_locked_at TIMESTAMPTZ;

ALTER TABLE public.tournament_rosters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read tournament_rosters" ON public.tournament_rosters;
CREATE POLICY "Public read tournament_rosters"
  ON public.tournament_rosters FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage tournament_rosters" ON public.tournament_rosters;
CREATE POLICY "Admins manage tournament_rosters"
  ON public.tournament_rosters FOR ALL
  USING (private.is_score_admin())
  WITH CHECK (private.is_score_admin());

SELECT count(*) AS tournament_roster_rows FROM public.tournament_rosters;
