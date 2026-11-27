-- =============================================================================
-- AU SCORE — FULL SCHEMA (paste once into Supabase SQL Editor)
-- =============================================================================
-- Idempotent: safe to re-run. Assumes AU Digest may already exist
-- (public.profiles, private schema, auth trigger).
--
-- Includes:
--   core registry, matches/events, competition structure, awards, lineups,
--   venues + guest teams, staff helpers, Phantom sessions, storage buckets,
--   seed sports + default venues + Friendlies tournaments.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE SCHEMA IF NOT EXISTS private;

-- ─── Enums ──────────────────────────────────────────────────────────────────

DO $$ BEGIN CREATE TYPE public.match_status AS ENUM ('scheduled', 'live', 'paused', 'completed', 'cancelled', 'postponed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.tournament_category AS ENUM ('league', 'knockout_cup', 'friendly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.sport_type AS ENUM ('team', 'individual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.score_type AS ENUM ('points', 'sets', 'time');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.vote_choice AS ENUM ('home', 'draw', 'away');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.match_scope AS ENUM ('official', 'pickup');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Optional Score role enum (Digest keeps profiles.role as text)
DO $$ BEGIN CREATE TYPE public.score_user_role AS ENUM ('super_admin', 'record_keeper', 'student');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Core registry ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  short_code VARCHAR(10) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  type public.sport_type NOT NULL,
  score_type public.score_type NOT NULL
);

CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  sport_id UUID NOT NULL REFERENCES public.sports(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  logo_url TEXT,
  is_guest BOOLEAN NOT NULL DEFAULT false,
  institution TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Guest / AU uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS teams_department_sport_active_key
  ON public.teams (department_id, sport_id)
  WHERE department_id IS NOT NULL AND deleted_at IS NULL AND is_guest = false;

CREATE UNIQUE INDEX IF NOT EXISTS teams_guest_name_sport_active_key
  ON public.teams (lower(name), sport_id)
  WHERE is_guest = true AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  nickname VARCHAR(100),
  matric_number VARCHAR(50) UNIQUE,
  avatar_url TEXT,
  position VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.player_sport_registry (
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  jersey_number INTEGER,
  is_active BOOLEAN DEFAULT true,
  squad_role VARCHAR(30) DEFAULT 'Squad',
  PRIMARY KEY (player_id, team_id)
);

-- ─── Profiles (shared with Digest — extend only) ────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'reader',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS matric_number TEXT,
  ADD COLUMN IF NOT EXISTS department_id UUID,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_department_id_fkey
    FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_matric_number_key
  ON public.profiles (matric_number)
  WHERE matric_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.record_keeper_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id UUID NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, match_id)
);

-- ─── Competitions & matches ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  sport_id UUID NOT NULL REFERENCES public.sports(id) ON DELETE CASCADE,
  category public.tournament_category NOT NULL,
  season VARCHAR(20) NOT NULL DEFAULT '2025/26',
  rules JSONB NOT NULL DEFAULT '{"extra_time": false, "penalty_shootout": false}',
  format VARCHAR(30) DEFAULT 'league',
  phases JSONB DEFAULT '[]',
  competition_type VARCHAR(10) DEFAULT 'league',
  config JSONB DEFAULT '{}',
  title_holder_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  title_holder_name VARCHAR(150),
  title_holder_season VARCHAR(20),
  is_draft BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  location VARCHAR(200) NOT NULL DEFAULT 'Achievers University, Owo',
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS venues_name_active_key
  ON public.venues (lower(name))
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  sport_id UUID NOT NULL REFERENCES public.sports(id) ON DELETE CASCADE,
  home_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  away_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  status public.match_status NOT NULL DEFAULT 'scheduled',
  current_period VARCHAR(50) NOT NULL DEFAULT 'not_started',
  home_score INTEGER NOT NULL DEFAULT 0,
  away_score INTEGER NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  win_probability JSONB,
  home_penalties INTEGER,
  away_penalties INTEGER,
  went_to_extra_time BOOLEAN DEFAULT false,
  clock_elapsed_seconds INTEGER NOT NULL DEFAULT 0,
  clock_is_running BOOLEAN NOT NULL DEFAULT false,
  clock_is_time_lost BOOLEAN NOT NULL DEFAULT false,
  clock_running_started_at TIMESTAMPTZ,
  allows_extra_time BOOLEAN NOT NULL DEFAULT false,
  allows_penalty_shootout BOOLEAN NOT NULL DEFAULT false,
  lineup_image_url TEXT,
  referee_name TEXT,
  assistant_referee_1 TEXT,
  assistant_referee_2 TEXT,
  postpone_reason TEXT,
  competition_phase VARCHAR(30),
  match_variant VARCHAR(20) DEFAULT 'standard',
  competition_format VARCHAR(20) DEFAULT 'team_vs_team',
  group_id UUID,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  scope public.match_scope NOT NULL DEFAULT 'official',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.record_keeper_assignments
    ADD CONSTRAINT fk_rka_match FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_scheduled ON public.matches(scheduled_at);
CREATE INDEX IF NOT EXISTS matches_venue_id_idx ON public.matches (venue_id);
CREATE INDEX IF NOT EXISTS matches_scope_idx ON public.matches (scope);

-- ─── Events / scores / track ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  period VARCHAR(50) NOT NULL,
  match_time VARCHAR(10) NOT NULL,
  details JSONB DEFAULT '{}',
  is_void BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_events_match ON public.match_events(match_id, created_at);

CREATE TABLE IF NOT EXISTS public.match_rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  is_starter BOOLEAN NOT NULL DEFAULT false,
  jersey_number INTEGER,
  UNIQUE(match_id, player_id)
);

CREATE TABLE IF NOT EXISTS public.match_clock_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL,
  match_time VARCHAR(10) NOT NULL,
  accumulated_lost_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.match_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote public.vote_choice NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.track_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  lane_number INTEGER,
  heat_number INTEGER DEFAULT 1,
  finish_time_ms INTEGER,
  finish_rank INTEGER,
  result_status VARCHAR(20) DEFAULT 'finished',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id, player_id)
);

CREATE TABLE IF NOT EXISTS public.team_elo_ratings (
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  rating NUMERIC(8,2) NOT NULL DEFAULT 1000,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (team_id, tournament_id)
);

CREATE TABLE IF NOT EXISTS public.player_suspensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  reason VARCHAR(100) NOT NULL,
  triggered_by_event_id UUID REFERENCES public.match_events(id) ON DELETE SET NULL,
  suspended_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  suspended_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_suspensions_active
  ON public.player_suspensions(player_id) WHERE is_active = true;

-- ─── Competition structure ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tournament_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(tournament_id, name)
);

CREATE TABLE IF NOT EXISTS public.group_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.tournament_groups(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS public.bracket_fixtures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round VARCHAR(30) NOT NULL,
  round_label VARCHAR(50) NOT NULL,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  home_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  away_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  home_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  away_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
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

CREATE TABLE IF NOT EXISTS public.meet_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  event_name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  scheduled_at TIMESTAMPTZ,
  venue VARCHAR(100),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.period_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  period VARCHAR(30) NOT NULL,
  label VARCHAR(30) NOT NULL,
  home_score INTEGER NOT NULL DEFAULT 0,
  away_score INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(match_id, period)
);

CREATE TABLE IF NOT EXISTS public.set_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  home_games INTEGER NOT NULL DEFAULT 0,
  away_games INTEGER NOT NULL DEFAULT 0,
  tiebreak BOOLEAN DEFAULT false,
  UNIQUE(match_id, set_number)
);

CREATE TABLE IF NOT EXISTS public.tournament_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  seed INTEGER,
  received_bye BOOLEAN NOT NULL DEFAULT false,
  registered_at TIMESTAMPTZ DEFAULT now(),
  roster_locked_at TIMESTAMPTZ,
  UNIQUE(tournament_id, team_id)
);

-- Players nominated onto a competition side (club pool stays unlimited)
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

CREATE TABLE IF NOT EXISTS public.season_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  sport_id UUID NOT NULL REFERENCES public.sports(id) ON DELETE CASCADE,
  award_type VARCHAR(40) NOT NULL,
  season VARCHAR(20) NOT NULL DEFAULT '2025/26',
  week_number INTEGER,
  player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  display_label VARCHAR(100),
  stat_value NUMERIC(10,2),
  metadata JSONB DEFAULT '{}',
  lineup JSONB DEFAULT '[]',
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_season_awards_sport ON public.season_awards(sport_id, season);
CREATE UNIQUE INDEX IF NOT EXISTS idx_season_awards_unique_week
  ON public.season_awards(sport_id, season, award_type, week_number)
  WHERE week_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.match_lineups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  players JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'predicted' CHECK (status IN ('predicted', 'confirmed')),
  published_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id, team_id)
);

CREATE TABLE IF NOT EXISTS public.score_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path TEXT,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'bug' CHECK (category IN ('bug', 'idea', 'other')),
  message TEXT NOT NULL,
  contact_email TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_lineups_match ON public.match_lineups(match_id);
CREATE INDEX IF NOT EXISTS idx_bracket_fixtures_tournament ON public.bracket_fixtures(tournament_id);
CREATE INDEX IF NOT EXISTS idx_group_standings_group ON public.group_standings(group_id);
CREATE INDEX IF NOT EXISTS idx_meet_events_tournament ON public.meet_events(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament ON public.tournament_teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_rosters_tournament ON public.tournament_rosters(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_rosters_team ON public.tournament_rosters(tournament_id, team_id);

-- ─── Platform roles ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.score_user_roles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('platform_owner', 'super_admin', 'admin', 'student')),
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.score_admins (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  all_sports BOOLEAN NOT NULL DEFAULT false,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.score_admin_sports (
  user_id UUID NOT NULL REFERENCES public.score_admins(user_id) ON DELETE CASCADE,
  sport_id UUID NOT NULL,
  PRIMARY KEY (user_id, sport_id)
);

-- ─── Phantom ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.phantom_sessions (
  id TEXT PRIMARY KEY,
  code VARCHAR(12) NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('setup', 'live', 'completed')),
  settings JSONB NOT NULL,
  matches JSONB NOT NULL DEFAULT '[]'::jsonb,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  standings JSONB NOT NULL DEFAULT '[]'::jsonb,
  active_match_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  concluded_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS phantom_sessions_code_idx ON public.phantom_sessions (code);
CREATE INDEX IF NOT EXISTS phantom_sessions_status_idx ON public.phantom_sessions (status)
  WHERE deleted_at IS NULL;

-- ─── Staff helpers (required by venue / match / phantom policies) ───────────

CREATE OR REPLACE FUNCTION private.is_platform_owner(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.score_user_roles
    WHERE user_id = uid AND role = 'platform_owner'
  );
$$;

CREATE OR REPLACE FUNCTION private.is_score_super_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT private.is_platform_owner(uid)
    OR EXISTS (
      SELECT 1 FROM public.score_user_roles
      WHERE user_id = uid AND role = 'super_admin'
    );
$$;

CREATE OR REPLACE FUNCTION private.is_score_admin(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT private.is_score_super_admin(uid)
    OR EXISTS (
      SELECT 1 FROM public.score_user_roles
      WHERE user_id = uid AND role IN ('admin', 'super_admin', 'platform_owner')
    )
    OR EXISTS (
      SELECT 1 FROM public.score_admins WHERE user_id = uid
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = uid AND role::text IN ('super_admin', 'admin')
    );
$$;

CREATE OR REPLACE FUNCTION private.is_record_keeper(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT private.is_score_admin(uid)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = uid AND role::text IN ('record_keeper', 'super_admin')
    );
$$;

CREATE OR REPLACE FUNCTION private.can_manage_matches(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT private.is_score_admin(uid) OR private.is_record_keeper(uid);
$$;

-- Digest helpers (create if Digest not yet applied)
CREATE OR REPLACE FUNCTION private.my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT coalesce(
    (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())),
    'anon'
  );
$$;

CREATE OR REPLACE FUNCTION private.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$ SELECT private.my_role() IN ('editor', 'admin') $$;

-- ─── Score functions ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.recalculate_match_score(p_match_id UUID)
RETURNS VOID AS $$
DECLARE
  v_home_score INTEGER := 0;
  v_away_score INTEGER := 0;
  v_home_team_id UUID;
  v_away_team_id UUID;
BEGIN
  SELECT home_team_id, away_team_id INTO v_home_team_id, v_away_team_id
  FROM public.matches WHERE id = p_match_id;

  SELECT
    COALESCE(SUM(CASE WHEN team_id = v_home_team_id AND event_type = 'goal' AND NOT is_void THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN team_id = v_away_team_id AND event_type = 'goal' AND NOT is_void THEN 1 ELSE 0 END), 0)
  INTO v_home_score, v_away_score
  FROM public.match_events
  WHERE match_id = p_match_id;

  UPDATE public.matches
  SET home_score = v_home_score, away_score = v_away_score
  WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.trigger_recalculate_score()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.recalculate_match_score(COALESCE(NEW.match_id, OLD.match_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_match_events_score ON public.match_events;
CREATE TRIGGER trg_match_events_score
  AFTER INSERT OR UPDATE OR DELETE ON public.match_events
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_score();

CREATE OR REPLACE FUNCTION public.handle_disallowed_goal()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type = 'disallowed' AND NEW.details ? 'original_event_id' THEN
    UPDATE public.match_events
    SET is_void = true
    WHERE id = (NEW.details->>'original_event_id')::UUID;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_disallowed_goal ON public.match_events;
CREATE TRIGGER trg_disallowed_goal
  AFTER INSERT ON public.match_events
  FOR EACH ROW
  WHEN (NEW.event_type = 'disallowed')
  EXECUTE FUNCTION public.handle_disallowed_goal();

CREATE OR REPLACE FUNCTION public.calculate_elo_probability(rating_a NUMERIC, rating_b NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
  RETURN 1.0 / (1.0 + POWER(10, (rating_b - rating_a) / 400));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.update_elo_after_match(p_match_id UUID)
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
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id AND status = 'completed';
  IF NOT FOUND THEN RETURN; END IF;
  IF v_match.home_team_id IS NULL OR v_match.away_team_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(rating, 1000) INTO v_home_elo
  FROM public.team_elo_ratings
  WHERE team_id = v_match.home_team_id AND tournament_id = v_match.tournament_id;

  SELECT COALESCE(rating, 1000) INTO v_away_elo
  FROM public.team_elo_ratings
  WHERE team_id = v_match.away_team_id AND tournament_id = v_match.tournament_id;

  v_home_expected := public.calculate_elo_probability(v_home_elo, v_away_elo);
  v_away_expected := 1 - v_home_expected;

  IF v_match.home_score > v_match.away_score THEN
    v_home_actual := 1; v_away_actual := 0;
  ELSIF v_match.home_score < v_match.away_score THEN
    v_home_actual := 0; v_away_actual := 1;
  ELSE
    v_home_actual := 0.5; v_away_actual := 0.5;
  END IF;

  v_margin := ABS(v_match.home_score - v_match.away_score);
  v_mov_multiplier := LN(v_margin + 1) * 2.2;

  INSERT INTO public.team_elo_ratings (team_id, tournament_id, rating)
  VALUES (
    v_match.home_team_id,
    v_match.tournament_id,
    v_home_elo + v_k * v_mov_multiplier * (v_home_actual - v_home_expected)
  )
  ON CONFLICT (team_id, tournament_id)
  DO UPDATE SET rating = EXCLUDED.rating, updated_at = now();

  INSERT INTO public.team_elo_ratings (team_id, tournament_id, rating)
  VALUES (
    v_match.away_team_id,
    v_match.tournament_id,
    v_away_elo + v_k * v_mov_multiplier * (v_away_actual - v_away_expected)
  )
  ON CONFLICT (team_id, tournament_id)
  DO UPDATE SET rating = EXCLUDED.rating, updated_at = now();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.refresh_match_win_probability(p_match_id UUID)
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
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT COALESCE(rating, 1000) INTO v_home_elo
  FROM public.team_elo_ratings
  WHERE team_id = v_match.home_team_id AND tournament_id = v_match.tournament_id;

  SELECT COALESCE(rating, 1000) INTO v_away_elo
  FROM public.team_elo_ratings
  WHERE team_id = v_match.away_team_id AND tournament_id = v_match.tournament_id;

  v_home_prob := public.calculate_elo_probability(v_home_elo, v_away_elo);
  v_away_prob := 1 - v_home_prob;
  v_draw_prob := GREATEST(0.1, 0.25 - ABS(v_home_prob - v_away_prob) * 0.15);
  v_home_prob := v_home_prob * (1 - v_draw_prob);
  v_away_prob := v_away_prob * (1 - v_draw_prob);

  SELECT
    COUNT(*) FILTER (WHERE vote = 'home'),
    COUNT(*) FILTER (WHERE vote = 'draw'),
    COUNT(*) FILTER (WHERE vote = 'away')
  INTO v_vote_home, v_vote_draw, v_vote_away
  FROM public.match_votes WHERE match_id = p_match_id;

  v_total_votes := v_vote_home + v_vote_draw + v_vote_away;

  UPDATE public.matches SET win_probability = jsonb_build_object(
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

CREATE OR REPLACE FUNCTION public.check_disciplinary_action()
RETURNS TRIGGER AS $$
DECLARE
  v_yellow_count INTEGER;
BEGIN
  IF NEW.event_type = 'red_card' AND NOT NEW.is_void AND NEW.player_id IS NOT NULL THEN
    INSERT INTO public.player_suspensions (player_id, reason, triggered_by_event_id)
    VALUES (NEW.player_id, 'straight_red', NEW.id);
  END IF;

  IF NEW.event_type = 'yellow_card' AND NOT NEW.is_void AND NEW.player_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_yellow_count
    FROM public.match_events me
    JOIN public.matches m ON m.id = me.match_id
    WHERE me.player_id = NEW.player_id
      AND me.event_type = 'yellow_card'
      AND NOT me.is_void
      AND m.tournament_id = (SELECT tournament_id FROM public.matches WHERE id = NEW.match_id);

    IF v_yellow_count >= 3 THEN
      INSERT INTO public.player_suspensions (player_id, reason, triggered_by_event_id)
      VALUES (NEW.player_id, 'yellow_accumulation', NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_disciplinary ON public.match_events;
CREATE TRIGGER trg_disciplinary
  AFTER INSERT ON public.match_events
  FOR EACH ROW
  WHEN (NEW.event_type IN ('red_card', 'yellow_card'))
  EXECUTE FUNCTION public.check_disciplinary_action();

-- Auth profile bootstrap — compatible with Digest (display_name) + Score (email/full_name)
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);
  RETURN NEW;
END;
$$;

-- Also expose as public.handle_new_user for older Score trigger name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN private.handle_new_user();
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

-- ─── Realtime (ignore if already added) ─────────────────────────────────────

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.match_events;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.match_clock_logs;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bracket_fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meet_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.period_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_admin_sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phantom_sessions ENABLE ROW LEVEL SECURITY;

-- Public reads
DROP POLICY IF EXISTS "Public read departments" ON public.departments;
CREATE POLICY "Public read departments" ON public.departments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read teams" ON public.teams;
CREATE POLICY "Public read teams" ON public.teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read players" ON public.players;
CREATE POLICY "Public read players" ON public.players FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read tournaments" ON public.tournaments;
CREATE POLICY "Public read tournaments" ON public.tournaments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read matches" ON public.matches;
CREATE POLICY "Public read matches" ON public.matches FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read match_events" ON public.match_events;
CREATE POLICY "Public read match_events" ON public.match_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read tournament_groups" ON public.tournament_groups;
CREATE POLICY "Public read tournament_groups" ON public.tournament_groups FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read group_standings" ON public.group_standings;
CREATE POLICY "Public read group_standings" ON public.group_standings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read bracket_fixtures" ON public.bracket_fixtures;
CREATE POLICY "Public read bracket_fixtures" ON public.bracket_fixtures FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff manage bracket_fixtures" ON public.bracket_fixtures;
CREATE POLICY "Staff manage bracket_fixtures" ON public.bracket_fixtures
  FOR ALL USING (private.can_manage_matches()) WITH CHECK (private.can_manage_matches());

ALTER TABLE public.player_suspensions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read player_suspensions" ON public.player_suspensions;
CREATE POLICY "Public read player_suspensions" ON public.player_suspensions
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage player_suspensions" ON public.player_suspensions;
CREATE POLICY "Admins manage player_suspensions" ON public.player_suspensions
  FOR ALL USING (private.is_score_admin()) WITH CHECK (private.is_score_admin());

DROP POLICY IF EXISTS "Public read meet_events" ON public.meet_events;
CREATE POLICY "Public read meet_events" ON public.meet_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read period_scores" ON public.period_scores;
CREATE POLICY "Public read period_scores" ON public.period_scores FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read set_scores" ON public.set_scores;
CREATE POLICY "Public read set_scores" ON public.set_scores FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read tournament_teams" ON public.tournament_teams;
CREATE POLICY "Public read tournament_teams" ON public.tournament_teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read match_lineups" ON public.match_lineups;
CREATE POLICY "Public read match_lineups" ON public.match_lineups FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert score_feedback" ON public.score_feedback;
CREATE POLICY "Public insert score_feedback" ON public.score_feedback
  FOR INSERT TO anon, authenticated
  WITH CHECK (char_length(trim(message)) BETWEEN 3 AND 4000);

DROP POLICY IF EXISTS "Public read published season_awards" ON public.season_awards;
CREATE POLICY "Public read published season_awards" ON public.season_awards
  FOR SELECT USING (published = true);

DROP POLICY IF EXISTS "venues: public read" ON public.venues;
CREATE POLICY "venues: public read" ON public.venues FOR SELECT USING (true);

-- Profiles
DROP POLICY IF EXISTS "profiles: public read" ON public.profiles;
CREATE POLICY "profiles: public read" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles: update own name" ON public.profiles;
CREATE POLICY "profiles: update own name" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Votes
DROP POLICY IF EXISTS "Authenticated users vote" ON public.match_votes;
CREATE POLICY "Authenticated users vote" ON public.match_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own votes" ON public.match_votes;
CREATE POLICY "Users read own votes" ON public.match_votes
  FOR SELECT USING (auth.uid() = user_id);

-- Keepers / staff writes
DROP POLICY IF EXISTS "Keepers insert events" ON public.match_events;
DROP POLICY IF EXISTS "Record keepers insert match_events" ON public.match_events;
CREATE POLICY "Record keepers insert match_events" ON public.match_events
  FOR INSERT WITH CHECK (private.can_manage_matches());

DROP POLICY IF EXISTS "Record keepers update match_events" ON public.match_events;
CREATE POLICY "Record keepers update match_events" ON public.match_events
  FOR UPDATE USING (private.can_manage_matches());

DROP POLICY IF EXISTS "Admins manage departments" ON public.departments;
CREATE POLICY "Admins manage departments" ON public.departments
  FOR ALL USING (private.is_score_admin()) WITH CHECK (private.is_score_admin());

DROP POLICY IF EXISTS "Admins manage teams" ON public.teams;
CREATE POLICY "Admins manage teams" ON public.teams
  FOR ALL USING (private.can_manage_matches()) WITH CHECK (private.can_manage_matches());

DROP POLICY IF EXISTS "Admins manage players" ON public.players;
CREATE POLICY "Admins manage players" ON public.players
  FOR ALL USING (private.is_score_admin()) WITH CHECK (private.is_score_admin());

DROP POLICY IF EXISTS "Admins manage tournaments" ON public.tournaments;
CREATE POLICY "Admins manage tournaments" ON public.tournaments
  FOR ALL USING (private.is_score_admin()) WITH CHECK (private.is_score_admin());

DROP POLICY IF EXISTS "venues: admin insert" ON public.venues;
CREATE POLICY "venues: admin insert" ON public.venues
  FOR INSERT WITH CHECK (private.is_score_admin());

DROP POLICY IF EXISTS "venues: admin update" ON public.venues;
CREATE POLICY "venues: admin update" ON public.venues
  FOR UPDATE USING (private.is_score_admin()) WITH CHECK (private.is_score_admin());

DROP POLICY IF EXISTS "matches: staff insert" ON public.matches;
CREATE POLICY "matches: staff insert" ON public.matches
  FOR INSERT WITH CHECK (private.can_manage_matches());

DROP POLICY IF EXISTS "matches: staff update" ON public.matches;
CREATE POLICY "matches: staff update" ON public.matches
  FOR UPDATE USING (private.can_manage_matches()) WITH CHECK (private.can_manage_matches());

DROP POLICY IF EXISTS "Admins manage season_awards" ON public.season_awards;
CREATE POLICY "Admins manage season_awards" ON public.season_awards
  FOR ALL USING (private.is_score_admin()) WITH CHECK (private.is_score_admin());

DROP POLICY IF EXISTS "Admins manage tournament_teams" ON public.tournament_teams;
CREATE POLICY "Admins manage tournament_teams" ON public.tournament_teams
  FOR ALL USING (private.can_manage_matches()) WITH CHECK (private.can_manage_matches());

ALTER TABLE public.tournament_rosters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read tournament_rosters" ON public.tournament_rosters;
CREATE POLICY "Public read tournament_rosters" ON public.tournament_rosters FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage tournament_rosters" ON public.tournament_rosters;
CREATE POLICY "Admins manage tournament_rosters" ON public.tournament_rosters
  FOR ALL USING (private.is_score_admin()) WITH CHECK (private.is_score_admin());

DROP POLICY IF EXISTS "Staff manage match_lineups" ON public.match_lineups;
CREATE POLICY "Staff manage match_lineups" ON public.match_lineups
  FOR ALL USING (private.can_manage_matches()) WITH CHECK (private.can_manage_matches());

DROP POLICY IF EXISTS "score_user_roles: owner read all" ON public.score_user_roles;
CREATE POLICY "score_user_roles: owner read all"
  ON public.score_user_roles FOR SELECT
  USING (private.is_platform_owner() OR private.is_score_super_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS "score_user_roles: owner manage" ON public.score_user_roles;
CREATE POLICY "score_user_roles: owner manage"
  ON public.score_user_roles FOR ALL
  USING (private.is_platform_owner())
  WITH CHECK (private.is_platform_owner());

DROP POLICY IF EXISTS "score_admins: staff read" ON public.score_admins;
CREATE POLICY "score_admins: staff read"
  ON public.score_admins FOR SELECT
  USING (private.is_score_super_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS "score_admins: super admin manage" ON public.score_admins;
CREATE POLICY "score_admins: super admin manage"
  ON public.score_admins FOR ALL
  USING (private.is_score_super_admin())
  WITH CHECK (private.is_score_super_admin());

DROP POLICY IF EXISTS "score_admin_sports: staff read" ON public.score_admin_sports;
CREATE POLICY "score_admin_sports: staff read"
  ON public.score_admin_sports FOR SELECT
  USING (private.is_score_super_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS "score_admin_sports: super admin manage" ON public.score_admin_sports;
CREATE POLICY "score_admin_sports: super admin manage"
  ON public.score_admin_sports FOR ALL
  USING (private.is_score_super_admin())
  WITH CHECK (private.is_score_super_admin());

DROP POLICY IF EXISTS "phantom: public read completed" ON public.phantom_sessions;
CREATE POLICY "phantom: public read completed"
  ON public.phantom_sessions FOR SELECT
  USING (deleted_at IS NULL AND (status = 'completed' OR created_by = auth.uid() OR auth.uid() IS NOT NULL));

DROP POLICY IF EXISTS "phantom: anyone insert" ON public.phantom_sessions;
CREATE POLICY "phantom: anyone insert"
  ON public.phantom_sessions FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "phantom: owner update" ON public.phantom_sessions;
CREATE POLICY "phantom: owner update"
  ON public.phantom_sessions FOR UPDATE
  USING (created_by = auth.uid() OR created_by IS NULL OR private.can_manage_matches())
  WITH CHECK (created_by = auth.uid() OR created_by IS NULL OR private.can_manage_matches());

-- ─── Storage buckets ────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('club-logos', 'club-logos', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('player-avatars', 'player-avatars', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('avatars', 'avatars', true, 1048576, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "club-logos: public read" ON storage.objects;
CREATE POLICY "club-logos: public read"
  ON storage.objects FOR SELECT USING (bucket_id = 'club-logos');

DROP POLICY IF EXISTS "club-logos: authenticated upload" ON storage.objects;
CREATE POLICY "club-logos: authenticated upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'club-logos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "club-logos: owner update" ON storage.objects;
CREATE POLICY "club-logos: owner update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'club-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "player-avatars: public read" ON storage.objects;
CREATE POLICY "player-avatars: public read"
  ON storage.objects FOR SELECT USING (bucket_id = 'player-avatars');

DROP POLICY IF EXISTS "player-avatars: authenticated upload" ON storage.objects;
CREATE POLICY "player-avatars: authenticated upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'player-avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "player-avatars: owner update" ON storage.objects;
CREATE POLICY "player-avatars: owner update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'player-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "avatars: public read" ON storage.objects;
CREATE POLICY "avatars: public read"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars: own upload" ON storage.objects;
CREATE POLICY "avatars: own upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "avatars: own update" ON storage.objects;
CREATE POLICY "avatars: own update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ─── Seed sports ────────────────────────────────────────────────────────────

INSERT INTO public.sports (name, type, score_type)
VALUES
  ('Football', 'team', 'points'),
  ('Basketball', 'team', 'points'),
  ('Tennis', 'team', 'sets'),
  ('Volleyball', 'team', 'sets'),
  ('Track', 'individual', 'time')
ON CONFLICT (name) DO NOTHING;

-- ─── Seed venues ────────────────────────────────────────────────────────────

INSERT INTO public.venues (name, location)
SELECT v.name, v.location
FROM (VALUES
  ('Joked Field', 'Achievers University, Owo'),
  ('Main Field', 'Achievers University, Owo'),
  ('Main Court', 'Achievers University, Owo'),
  ('Indoor Hall', 'Achievers University, Owo'),
  ('Tennis Courts', 'Achievers University, Owo'),
  ('Main Track', 'Achievers University, Owo')
) AS v(name, location)
WHERE NOT EXISTS (
  SELECT 1 FROM public.venues existing
  WHERE lower(existing.name) = lower(v.name) AND existing.deleted_at IS NULL
);

-- Friendlies tournament per sport (for manual / guest results)
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

-- =============================================================================
-- DONE
-- Next (optional): grant yourself admin after signup:
--   insert into public.score_user_roles (user_id, role)
--   values ('YOUR-AUTH-USER-UUID', 'platform_owner');
-- =============================================================================
