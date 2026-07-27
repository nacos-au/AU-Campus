-- Season awards: top scorer, POTS, TOTS, TOTW
CREATE TABLE IF NOT EXISTS season_awards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
    sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
    award_type VARCHAR(40) NOT NULL,
    season VARCHAR(20) NOT NULL DEFAULT '2025/26',
    week_number INTEGER,
    player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    display_label VARCHAR(100),
    stat_value NUMERIC(10,2),
  metadata JSONB DEFAULT '{}',
    published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_season_awards_sport ON season_awards(sport_id, season);
CREATE UNIQUE INDEX IF NOT EXISTS idx_season_awards_unique_week
  ON season_awards(sport_id, season, award_type, week_number)
  WHERE week_number IS NOT NULL;

ALTER TABLE track_results
  ADD COLUMN IF NOT EXISTS result_status VARCHAR(20) DEFAULT 'finished';

ALTER TABLE season_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published season_awards" ON season_awards
  FOR SELECT USING (published = true);

CREATE POLICY "Admins manage season_awards" ON season_awards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM score_admins sa
      JOIN profiles p ON p.id = auth.uid()
      WHERE sa.user_id = p.id OR p.role = 'super_admin'
    )
  );
