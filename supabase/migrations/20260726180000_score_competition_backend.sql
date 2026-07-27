-- AU Score: Competition structure + extended match metadata
-- Supports brackets, group standings, meet schedules for all sports

-- Tournament format (league, group_knockout, knockout_only)
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS format VARCHAR(30) DEFAULT 'league',
  ADD COLUMN IF NOT EXISTS phases JSONB DEFAULT '[]';

-- Extended match fields (penalties, ET, competition context)
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS home_penalties INTEGER,
  ADD COLUMN IF NOT EXISTS away_penalties INTEGER,
  ADD COLUMN IF NOT EXISTS went_to_extra_time BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS competition_phase VARCHAR(30),
  ADD COLUMN IF NOT EXISTS match_variant VARCHAR(20) DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS competition_format VARCHAR(20) DEFAULT 'team_vs_team',
  ADD COLUMN IF NOT EXISTS group_id UUID;

-- =============================================================================
-- COMPETITION STRUCTURE
-- =============================================================================

CREATE TABLE IF NOT EXISTS tournament_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE(tournament_id, name)
);

CREATE TABLE IF NOT EXISTS group_standings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES tournament_groups(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    played INTEGER NOT NULL DEFAULT 0,
    won INTEGER NOT NULL DEFAULT 0,
    drawn INTEGER NOT NULL DEFAULT 0,
    lost INTEGER NOT NULL DEFAULT 0,
    goals_for INTEGER NOT NULL DEFAULT 0,
    goals_against INTEGER NOT NULL DEFAULT 0,
    points INTEGER NOT NULL DEFAULT 0,
    form JSONB DEFAULT '[]',
    UNIQUE(group_id, team_id)
);

CREATE TABLE IF NOT EXISTS bracket_fixtures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    round VARCHAR(30) NOT NULL,
    round_label VARCHAR(50) NOT NULL,
    match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
    home_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    away_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    home_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    away_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    home_display_name VARCHAR(150),
    away_display_name VARCHAR(150),
    home_subtitle VARCHAR(20),
    away_subtitle VARCHAR(20),
    home_avatar_url TEXT,
    away_avatar_url TEXT,
    bracket_mode VARCHAR(10) NOT NULL DEFAULT 'team',
    home_score INTEGER,
    away_score INTEGER,
    home_penalties INTEGER,
    away_penalties INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    scheduled_at TIMESTAMPTZ,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS meet_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    event_name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL,
    match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    scheduled_at TIMESTAMPTZ,
    venue VARCHAR(100),
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS period_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    period VARCHAR(30) NOT NULL,
    label VARCHAR(30) NOT NULL,
    home_score INTEGER NOT NULL DEFAULT 0,
    away_score INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE(match_id, period)
);

CREATE TABLE IF NOT EXISTS set_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    home_games INTEGER NOT NULL DEFAULT 0,
    away_games INTEGER NOT NULL DEFAULT 0,
    tiebreak BOOLEAN DEFAULT false,
    UNIQUE(match_id, set_number)
);

-- Squad registry with role tier (Starting XI, Bench, etc.)
ALTER TABLE player_sport_registry
  ADD COLUMN IF NOT EXISTS squad_role VARCHAR(30) DEFAULT 'Squad';

CREATE INDEX IF NOT EXISTS idx_bracket_fixtures_tournament ON bracket_fixtures(tournament_id);
CREATE INDEX IF NOT EXISTS idx_group_standings_group ON group_standings(group_id);
CREATE INDEX IF NOT EXISTS idx_meet_events_tournament ON meet_events(tournament_id);
CREATE INDEX IF NOT EXISTS idx_match_events_match ON match_events(match_id);

-- RLS: public read for competition data
ALTER TABLE tournament_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bracket_fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE meet_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read tournament_groups" ON tournament_groups FOR SELECT USING (true);
CREATE POLICY "Public read group_standings" ON group_standings FOR SELECT USING (true);
CREATE POLICY "Public read bracket_fixtures" ON bracket_fixtures FOR SELECT USING (true);
CREATE POLICY "Public read meet_events" ON meet_events FOR SELECT USING (true);
CREATE POLICY "Public read period_scores" ON period_scores FOR SELECT USING (true);
CREATE POLICY "Public read set_scores" ON set_scores FOR SELECT USING (true);

-- Record keepers can insert match events
CREATE POLICY "Record keepers insert match_events" ON match_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('record_keeper', 'super_admin')
    )
  );

CREATE POLICY "Record keepers update match_events" ON match_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('record_keeper', 'super_admin')
    )
  );
