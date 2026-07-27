-- Club-submitted match lineups. Clubs submit before kickoff; the record
-- keeper works from this submission, and post-match clean sheets are computed
-- from goalkeeper stints in it. No row = "Lineup not available".

CREATE TABLE IF NOT EXISTS match_lineups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    -- [{ player_id, is_starting, role }]
    players JSONB NOT NULL DEFAULT '[]',
    submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    submitted_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(match_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_match_lineups_match ON match_lineups(match_id);

ALTER TABLE match_lineups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read match_lineups" ON match_lineups FOR SELECT USING (true);

CREATE POLICY "Staff manage match_lineups" ON match_lineups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'record_keeper', 'club_manager')
    )
  );
