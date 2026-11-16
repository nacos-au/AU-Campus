-- Apply on hosted Supabase SQL editor if migrations are not auto-applied.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.match_team_stats (
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  shots_on_target INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  corners INTEGER NOT NULL DEFAULT 0,
  fouls INTEGER NOT NULL DEFAULT 0,
  offsides INTEGER NOT NULL DEFAULT 0,
  yellow_cards INTEGER NOT NULL DEFAULT 0,
  red_cards INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_match_team_stats_match ON public.match_team_stats(match_id);

ALTER TABLE public.match_team_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read match_team_stats" ON public.match_team_stats;
CREATE POLICY "Public read match_team_stats" ON public.match_team_stats
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Match staff manage match_team_stats" ON public.match_team_stats;
CREATE POLICY "Match staff manage match_team_stats" ON public.match_team_stats
  FOR ALL
  USING (private.can_manage_matches())
  WITH CHECK (private.can_manage_matches());

DROP POLICY IF EXISTS "Admins manage season_awards" ON public.season_awards;
DROP POLICY IF EXISTS "Match staff manage season_awards" ON public.season_awards;
CREATE POLICY "Match staff manage season_awards" ON public.season_awards
  FOR ALL
  USING (private.can_manage_matches())
  WITH CHECK (private.can_manage_matches());

DROP POLICY IF EXISTS "Public read published season_awards" ON public.season_awards;
CREATE POLICY "Public read published season_awards" ON public.season_awards
  FOR SELECT USING (
    published = true
    OR private.can_manage_matches()
  );
