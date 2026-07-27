-- Competition setup: type (league/cup), title holder, team registration,
-- and lineup storage for Team of the Week / Season awards.

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS competition_type VARCHAR(10) DEFAULT 'league',
  ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS title_holder_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title_holder_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS title_holder_season VARCHAR(20);

-- Team registration per tournament (drives draw + bye math)
CREATE TABLE IF NOT EXISTS tournament_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    seed INTEGER,
    received_bye BOOLEAN NOT NULL DEFAULT false,
    registered_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tournament_id, team_id)
);

-- Formation lineup for team_of_week / team_of_season awards:
-- [{ player_id, player_name, team_code, role, rating, avatar_url }]
ALTER TABLE season_awards
  ADD COLUMN IF NOT EXISTS lineup JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament ON tournament_teams(tournament_id);

ALTER TABLE tournament_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read tournament_teams" ON tournament_teams FOR SELECT USING (true);

CREATE POLICY "Admins manage tournament_teams" ON tournament_teams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'record_keeper')
    )
  );
