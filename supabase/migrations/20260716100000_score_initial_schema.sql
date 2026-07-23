-- AU Score: Core Schema Migration
-- Run via Supabase CLI: supabase db push
-- Or paste into Supabase SQL Editor

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================
CREATE TYPE user_role AS ENUM ('super_admin', 'record_keeper', 'student');
CREATE TYPE match_status AS ENUM ('scheduled', 'live', 'paused', 'completed', 'cancelled');
CREATE TYPE tournament_category AS ENUM ('league', 'knockout_cup', 'friendly');
CREATE TYPE sport_type AS ENUM ('team', 'individual');
CREATE TYPE score_type AS ENUM ('points', 'sets', 'time');
CREATE TYPE vote_choice AS ENUM ('home', 'draw', 'away');

-- =============================================================================
-- CORE REGISTRY TABLES
-- =============================================================================

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    short_code VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    type sport_type NOT NULL,
    score_type score_type NOT NULL
);

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(department_id, sport_id)
);

CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    matric_number VARCHAR(50) UNIQUE,
    avatar_url TEXT,
    position VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE player_sport_registry (
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    jersey_number INTEGER,
    is_active BOOLEAN DEFAULT true,
    PRIMARY KEY (player_id, team_id)
);

-- =============================================================================
-- CENTRALIZED USER PROFILES (shared with AU Digest)
-- Links to auth.users in the SAME Supabase project
-- =============================================================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    matric_number VARCHAR(50) UNIQUE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    role user_role NOT NULL DEFAULT 'student',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE record_keeper_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    match_id UUID NOT NULL, -- FK added after matches table
    assigned_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, match_id)
);

-- =============================================================================
-- COMPETITIONS & MATCHES
-- =============================================================================

CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
    category tournament_category NOT NULL,
    season VARCHAR(20) NOT NULL DEFAULT '2025/26',
    rules JSONB NOT NULL DEFAULT '{"extra_time": false, "penalty_shootout": false}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    sport_id UUID NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
    home_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    away_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    status match_status NOT NULL DEFAULT 'scheduled',
    current_period VARCHAR(50) NOT NULL DEFAULT 'not_started',
    home_score INTEGER NOT NULL DEFAULT 0,
    away_score INTEGER NOT NULL DEFAULT 0,
    scheduled_at TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    win_probability JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE record_keeper_assignments
    ADD CONSTRAINT fk_rka_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;

-- =============================================================================
-- EVENT LEDGER (single source of truth)
-- =============================================================================

CREATE TABLE match_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    period VARCHAR(50) NOT NULL,
    match_time VARCHAR(10) NOT NULL,
    details JSONB DEFAULT '{}',
    is_void BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE match_rosters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    is_starter BOOLEAN NOT NULL DEFAULT false,
    jersey_number INTEGER,
    UNIQUE(match_id, player_id)
);

CREATE TABLE match_clock_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    event_type VARCHAR(20) NOT NULL, -- start, stop_time_lost, resume_play, end_period
    match_time VARCHAR(10) NOT NULL,
    accumulated_lost_ms INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE match_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    vote vote_choice NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(match_id, user_id)
);

-- =============================================================================
-- TRACK & FIELD
-- =============================================================================

CREATE TABLE track_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    lane_number INTEGER,
    heat_number INTEGER DEFAULT 1,
    finish_time_ms INTEGER, -- stored as milliseconds (10580 = 10.58s)
    finish_rank INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(match_id, player_id)
);

-- =============================================================================
-- ELO RATINGS & DISCIPLINARY
-- =============================================================================

CREATE TABLE team_elo_ratings (
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    rating NUMERIC(8,2) NOT NULL DEFAULT 1000,
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (team_id, tournament_id)
);

CREATE TABLE player_suspensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL, -- straight_red, yellow_accumulation
    triggered_by_event_id UUID REFERENCES match_events(id) ON DELETE SET NULL,
    suspended_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    suspended_until TIMESTAMPTZ, -- NULL = next match only
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_scheduled ON matches(scheduled_at);
CREATE INDEX idx_match_events_match ON match_events(match_id, created_at);
CREATE INDEX idx_profiles_matric ON profiles(matric_number);
CREATE INDEX idx_player_suspensions_active ON player_suspensions(player_id) WHERE is_active = true;

-- =============================================================================
-- SCORE RECALCULATION (Event Ledger Pattern)
-- =============================================================================

CREATE OR REPLACE FUNCTION recalculate_match_score(p_match_id UUID)
RETURNS VOID AS $$
DECLARE
    v_home_score INTEGER := 0;
    v_away_score INTEGER := 0;
    v_home_team_id UUID;
    v_away_team_id UUID;
BEGIN
    SELECT home_team_id, away_team_id INTO v_home_team_id, v_away_team_id
    FROM matches WHERE id = p_match_id;

    SELECT
        COALESCE(SUM(CASE
            WHEN team_id = v_home_team_id
                AND event_type IN ('goal', '2_pointer', '3_pointer', '1_pointer', 'point')
                AND NOT is_void
            THEN 1
            WHEN team_id = v_home_team_id
                AND event_type = '2_pointer' AND NOT is_void THEN 2
            WHEN team_id = v_home_team_id
                AND event_type = '3_pointer' AND NOT is_void THEN 3
            ELSE 0
        END), 0),
        COALESCE(SUM(CASE
            WHEN team_id = v_away_team_id
                AND event_type IN ('goal', '1_pointer', 'point')
                AND NOT is_void
            THEN 1
            WHEN team_id = v_away_team_id
                AND event_type = '2_pointer' AND NOT is_void THEN 2
            WHEN team_id = v_away_team_id
                AND event_type = '3_pointer' AND NOT is_void THEN 3
            ELSE 0
        END), 0)
    INTO v_home_score, v_away_score
    FROM match_events
    WHERE match_id = p_match_id
      AND event_type NOT IN ('assist', 'foul', 'yellow_card', 'red_card', 'substitution', 'disallowed', 'penalty_shootout_kick');

    -- Simpler goal-only path for football
    SELECT
        COALESCE(SUM(CASE WHEN team_id = v_home_team_id AND event_type = 'goal' AND NOT is_void THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN team_id = v_away_team_id AND event_type = 'goal' AND NOT is_void THEN 1 ELSE 0 END), 0)
    INTO v_home_score, v_away_score
    FROM match_events
    WHERE match_id = p_match_id;

    UPDATE matches
    SET home_score = v_home_score, away_score = v_away_score
    WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_recalculate_score()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM recalculate_match_score(COALESCE(NEW.match_id, OLD.match_id));
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_match_events_score
    AFTER INSERT OR UPDATE OR DELETE ON match_events
    FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_score();

-- Handle disallowed goals (VAR)
CREATE OR REPLACE FUNCTION handle_disallowed_goal()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.event_type = 'disallowed' AND NEW.details ? 'original_event_id' THEN
        UPDATE match_events
        SET is_void = true
        WHERE id = (NEW.details->>'original_event_id')::UUID;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_disallowed_goal
    AFTER INSERT ON match_events
    FOR EACH ROW
    WHEN (NEW.event_type = 'disallowed')
    EXECUTE FUNCTION handle_disallowed_goal();

-- =============================================================================
-- ELO RATING SYSTEM
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_elo_probability(rating_a NUMERIC, rating_b NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
    RETURN 1.0 / (1.0 + POWER(10, (rating_b - rating_a) / 400));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION update_elo_after_match(p_match_id UUID)
RETURNS VOID AS $$
DECLARE
    v_match RECORD;
    v_home_elo NUMERIC := 1000;
    v_away_elo NUMERIC := 1000;
    v_k NUMERIC := 32;
    v_home_expected NUMERIC;
    v_away_expected NUMERIC;
    v_home_actual NUMERIC;
    v_away_actual NUMERIC;
    v_margin INTEGER;
    v_mov_multiplier NUMERIC;
BEGIN
    SELECT * INTO v_match FROM matches WHERE id = p_match_id AND status = 'completed';
    IF NOT FOUND THEN RETURN; END IF;
    IF v_match.home_team_id IS NULL OR v_match.away_team_id IS NULL THEN RETURN; END IF;

    SELECT COALESCE(rating, 1000) INTO v_home_elo
    FROM team_elo_ratings
    WHERE team_id = v_match.home_team_id AND tournament_id = v_match.tournament_id;

    SELECT COALESCE(rating, 1000) INTO v_away_elo
    FROM team_elo_ratings
    WHERE team_id = v_match.away_team_id AND tournament_id = v_match.tournament_id;

    v_home_expected := calculate_elo_probability(v_home_elo, v_away_elo);
    v_away_expected := 1 - v_home_expected;

    IF v_match.home_score > v_match.away_score THEN
        v_home_actual := 1; v_away_actual := 0;
    ELSIF v_match.home_score < v_match.away_score THEN
        v_home_actual := 0; v_away_actual := 1;
    ELSE
        v_home_actual := 0.5; v_away_actual := 0.5;
    END IF;

    v_margin := ABS(v_match.home_score - v_match.away_score);
    v_mov_multiplier := LN(v_margin + 1) * (2.2 / ((v_home_actual > v_away_actual AND v_home_elo < v_away_elo) OR (v_away_actual > v_home_actual AND v_away_elo < v_home_elo) ? 1 : 1));

    INSERT INTO team_elo_ratings (team_id, tournament_id, rating)
    VALUES (v_match.home_team_id, v_match.tournament_id, v_home_elo + v_k * v_mov_multiplier * (v_home_actual - v_home_expected))
    ON CONFLICT (team_id, tournament_id)
    DO UPDATE SET rating = EXCLUDED.rating, updated_at = now();

    INSERT INTO team_elo_ratings (team_id, tournament_id, rating)
    VALUES (v_match.away_team_id, v_match.tournament_id, v_away_elo + v_k * v_mov_multiplier * (v_away_actual - v_away_expected))
    ON CONFLICT (team_id, tournament_id)
    DO UPDATE SET rating = EXCLUDED.rating, updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- WIN PROBABILITY FOR UPCOMING MATCHES
-- =============================================================================

CREATE OR REPLACE FUNCTION refresh_match_win_probability(p_match_id UUID)
RETURNS VOID AS $$
DECLARE
    v_match RECORD;
    v_home_elo NUMERIC := 1000;
    v_away_elo NUMERIC := 1000;
    v_home_prob NUMERIC;
    v_draw_prob NUMERIC := 0.22;
    v_away_prob NUMERIC;
    v_vote_home INTEGER;
    v_vote_draw INTEGER;
    v_vote_away INTEGER;
    v_total_votes INTEGER;
BEGIN
    SELECT * INTO v_match FROM matches WHERE id = p_match_id;
    IF NOT FOUND THEN RETURN; END IF;

    SELECT COALESCE(rating, 1000) INTO v_home_elo
    FROM team_elo_ratings WHERE team_id = v_match.home_team_id AND tournament_id = v_match.tournament_id;

    SELECT COALESCE(rating, 1000) INTO v_away_elo
    FROM team_elo_ratings WHERE team_id = v_match.away_team_id AND tournament_id = v_match.tournament_id;

    v_home_prob := calculate_elo_probability(v_home_elo, v_away_elo);
    v_away_prob := 1 - v_home_prob;
    v_draw_prob := GREATEST(0.1, 0.25 - ABS(v_home_prob - v_away_prob) * 0.15);
    v_home_prob := v_home_prob * (1 - v_draw_prob);
    v_away_prob := v_away_prob * (1 - v_draw_prob);

    SELECT
        COUNT(*) FILTER (WHERE vote = 'home'),
        COUNT(*) FILTER (WHERE vote = 'draw'),
        COUNT(*) FILTER (WHERE vote = 'away')
    INTO v_vote_home, v_vote_draw, v_vote_away
    FROM match_votes WHERE match_id = p_match_id;

    v_total_votes := v_vote_home + v_vote_draw + v_vote_away;

    UPDATE matches SET win_probability = jsonb_build_object(
        'algo', jsonb_build_object(
            'home', ROUND(v_home_prob * 100),
            'draw', ROUND(v_draw_prob * 100),
            'away', ROUND(v_away_prob * 100)
        ),
        'votes', jsonb_build_object(
            'home', CASE WHEN v_total_votes > 0 THEN ROUND(v_vote_home::NUMERIC / v_total_votes * 100) ELSE 0 END,
            'draw', CASE WHEN v_total_votes > 0 THEN ROUND(v_vote_draw::NUMERIC / v_total_votes * 100) ELSE 0 END,
            'away', CASE WHEN v_total_votes > 0 THEN ROUND(v_vote_away::NUMERIC / v_total_votes * 100) ELSE 0 END
        )
    ) WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- DISCIPLINARY: Auto-suspend on red / yellow accumulation
-- =============================================================================

CREATE OR REPLACE FUNCTION check_disciplinary_action()
RETURNS TRIGGER AS $$
DECLARE
    v_yellow_count INTEGER;
BEGIN
    IF NEW.event_type = 'red_card' AND NOT NEW.is_void THEN
        INSERT INTO player_suspensions (player_id, reason, triggered_by_event_id)
        VALUES (NEW.player_id, 'straight_red', NEW.id);
    END IF;

    IF NEW.event_type = 'yellow_card' AND NOT NEW.is_void THEN
        SELECT COUNT(*) INTO v_yellow_count
        FROM match_events me
        JOIN matches m ON m.id = me.match_id
        WHERE me.player_id = NEW.player_id
          AND me.event_type = 'yellow_card'
          AND NOT me.is_void
          AND m.tournament_id = (SELECT tournament_id FROM matches WHERE id = NEW.match_id);

        IF v_yellow_count >= 3 THEN
            INSERT INTO player_suspensions (player_id, reason, triggered_by_event_id)
            VALUES (NEW.player_id, 'yellow_accumulation', NEW.id);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_disciplinary
    AFTER INSERT ON match_events
    FOR EACH ROW
    WHEN (NEW.event_type IN ('red_card', 'yellow_card'))
    EXECUTE FUNCTION check_disciplinary_action();

-- =============================================================================
-- PROFILE AUTO-CREATE ON AUTH SIGNUP
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- REALTIME: Enable replication for live tables
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE match_events;
ALTER PUBLICATION supabase_realtime ADD TABLE match_clock_logs;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

-- Public read for sports data
CREATE POLICY "Public read departments" ON departments FOR SELECT USING (true);
CREATE POLICY "Public read teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Public read players" ON players FOR SELECT USING (true);
CREATE POLICY "Public read tournaments" ON tournaments FOR SELECT USING (true);
CREATE POLICY "Public read matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Public read match_events" ON match_events FOR SELECT USING (true);

-- Profiles: users read/update own
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Votes: authenticated students only, one per match
CREATE POLICY "Authenticated users vote" ON match_votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own votes" ON match_votes
    FOR SELECT USING (auth.uid() = user_id);

-- Record keepers can insert events for assigned matches
CREATE POLICY "Keepers insert events" ON match_events
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM record_keeper_assignments rka
            JOIN profiles p ON p.id = rka.user_id
            WHERE rka.match_id = match_events.match_id
              AND rka.user_id = auth.uid()
              AND p.role IN ('record_keeper', 'super_admin')
        )
    );

-- Admins full write on registry tables
CREATE POLICY "Admins manage departments" ON departments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Admins manage teams" ON teams
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Admins manage players" ON players
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Admins manage tournaments" ON tournaments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );
