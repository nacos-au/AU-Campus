-- =============================================================================
-- Match Notepad — pitch-side stat logs (separate from live match_events)
-- Idempotent. Paste into Supabase SQL editor.
-- Accessible to record keepers via Score admin Match Notepad.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.match_stat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id UUID NOT NULL REFERENCES public.sports(id),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  season TEXT NOT NULL DEFAULT '2026/27',
  home_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  away_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  home_team_name TEXT,
  away_team_name TEXT,
  home_score INT,
  away_score INT,
  scheduled_at TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_stat_logs_tournament
  ON public.match_stat_logs(tournament_id, scheduled_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_match_stat_logs_sport_season
  ON public.match_stat_logs(sport_id, season);
CREATE INDEX IF NOT EXISTS idx_match_stat_logs_match
  ON public.match_stat_logs(match_id);

ALTER TABLE public.match_stat_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Match staff manage match_stat_logs" ON public.match_stat_logs;
CREATE POLICY "Match staff manage match_stat_logs" ON public.match_stat_logs
  FOR ALL
  USING (private.can_manage_matches())
  WITH CHECK (private.can_manage_matches());

-- payload shape (football v1):
-- {
--   "goals_nil": false,
--   "cards_nil": false,
--   "goalkeepers": {
--     "home": { "player_id": null, "player_name": "..." },
--     "away": { "player_id": null, "player_name": "..." }
--   },
--   "goals": [{ "minute": 12, "type": "goal"|"penalty"|"own_goal", "side": "home"|"away",
--              "scorer_name": "...", "scorer_id": null, "assist_name": null, "assist_id": null, "solo": true }],
--   "cards": [{ "minute": 40, "type": "yellow"|"red", "side": "home"|"away",
--              "player_name": "...", "player_id": null }],
--   "notes": ""
-- }
