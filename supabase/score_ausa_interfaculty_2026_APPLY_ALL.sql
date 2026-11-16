-- =============================================================================
-- AUSA Interfaculty Football League (season 2026/27) — live seed
-- Idempotent: safe to re-run. Paste into Supabase SQL editor.
-- =============================================================================

CREATE TEMP TABLE IF NOT EXISTS _ausa_codes (
  code text PRIMARY KEY,
  dept_name text NOT NULL,
  team_name text NOT NULL
);
TRUNCATE _ausa_codes;
INSERT INTO _ausa_codes (code, dept_name, team_name) VALUES

  ('FOSMAS','Faculty of Social and Management Sciences','FOSMAS'),
  ('PHARMACY','Faculty of Pharmaceutical Sciences','Pharmacy'),
  ('MLS','Medical Laboratory Science','MLS'),
  ('NURSING','Nursing','Nursing'),
  ('LAW','Law','Law'),
  ('ENG','Engineering','Engineering'),  -- short_code ≤10 (ENGINEERING was 11)
  ('FBMS','Faculty of Basic Medical Sciences','FBMS'),
  ('MEDICINE','Medicine','Medicine'),
  ('FONAS','Faculty of Natural Sciences','FONAS');

DO $$
DECLARE
  v_sport uuid;
  v_tourn uuid;
  v_fosmas uuid;
  v_dept uuid;
  v_team uuid;
  v_player uuid;
  r record;
BEGIN
  SELECT id INTO v_sport FROM public.sports WHERE lower(name) IN ('football','soccer') LIMIT 1;
  IF v_sport IS NULL THEN
    RAISE EXCEPTION 'Football sport row missing';
  END IF;

  FOR r IN SELECT * FROM _ausa_codes LOOP
    INSERT INTO public.departments (name, short_code)
    VALUES (r.dept_name, r.code)
    ON CONFLICT (short_code) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_dept;

    SELECT id INTO v_dept FROM public.departments WHERE short_code = r.code;

    SELECT id INTO v_team FROM public.teams
    WHERE sport_id = v_sport AND department_id = v_dept AND is_guest = false AND deleted_at IS NULL
    LIMIT 1;

    IF v_team IS NULL THEN
      INSERT INTO public.teams (department_id, sport_id, name, is_guest)
      VALUES (v_dept, v_sport, r.team_name, false)
      RETURNING id INTO v_team;
    ELSE
      UPDATE public.teams SET name = r.team_name, deleted_at = NULL WHERE id = v_team;
    END IF;
  END LOOP;

  SELECT t.id INTO v_fosmas
  FROM public.teams t
  JOIN public.departments d ON d.id = t.department_id
  WHERE d.short_code = 'FOSMAS' AND t.sport_id = v_sport AND t.deleted_at IS NULL
  LIMIT 1;

  -- ── Tournament ────────────────────────────────────────────────────────────
  SELECT id INTO v_tourn FROM public.tournaments
  WHERE name = 'AUSA Interfaculty Football League' AND sport_id = v_sport
  LIMIT 1;

  IF v_tourn IS NULL THEN
    INSERT INTO public.tournaments (
      name, sport_id, category, season, rules, format, phases, competition_type, config,
      title_holder_team_id, title_holder_name, title_holder_season, is_draft
    ) VALUES (
      'AUSA Interfaculty Football League',
      v_sport,
      'league',
      '2026/27',
      '{"extra_time": false, "penalty_shootout": false}'::jsonb,
      'league',

      '[{"id": "league_a", "label": "League phase A", "starts": "2026-11-14", "ends": "2026-12-13"}, {"id": "break", "label": "Mid-season break", "starts": "2026-12-14", "ends": "2027-01-29"}, {"id": "league_b", "label": "League phase B", "starts": "2027-01-30", "ends": "2027-02-04"}, {"id": "qf", "label": "Quarter-finals", "starts": "2027-02-06", "ends": "2027-02-09"}, {"id": "sf", "label": "Semi-finals", "starts": "2027-02-11", "ends": "2027-02-12"}, {"id": "final", "label": "Final", "starts": "2027-02-14", "ends": "2027-02-14"}]'::jsonb,
      'league',
      '{"max_squad_size": 40, "max_subs": 9, "qualification": {"top": 8, "note": "Top 8 teams advance to the quarter-finals."}, "motto": "Competing for glory, not fighting for enemies.", "authority": "AUSA Sports Committee", "sport_secretary": "Aiyegbusi Ayokunle", "regulations": ["Arrive at the venue at least 30 minutes before kickoff.", "Only duly registered students and officially approved players may play.", "Provide a valid student ID or approved ID when requested.", "Wear approved jerseys, shorts, socks and football boots.", "Visible jersey numbers throughout; no two players in a team share a number.", "Respect referees, assistants, match commissioners and officials; no insults, threats or intimidation.", "No fighting, pushing, slapping or any physical confrontation.", "No insulting, abusive, threatening or offensive language toward anyone.", "No reckless tackles, intentional injuries or violent conduct.", "Show good sportsmanship whatever the result.", "No celebrations or gestures meant to provoke or disrespect opponents.", "Accept all referee decisions; only the captain may respectfully seek clarification.", "Substitutions only with the approval of the referee or match officials.", "No deliberate delays or refusal to restart play.", "Captains are responsible for their players'' discipline.", "Fielding an ineligible or unregistered player may bring sanctions, including forfeiture of the match.", "No team or player may abandon a match without valid reason and official approval.", "No participation under the influence of alcohol or any intoxicating substance.", "Misconduct, violence, cheating, or serious indiscipline may lead to suspension, disqualification, or other sanctions.", "The AUSA Sports Committee and designated match officials enforce these rules and have final authority."], "staff": {"FBMS": {"coach": "Gabriel", "assistant_coach": "Preseguar"}, "NURSING": {"coach": "Bolu", "staff": ["Voltage", "Richard"]}}}'::jsonb,
      v_fosmas,
      'FOSMAS',
      'Previous',
      false
    ) RETURNING id INTO v_tourn;
  ELSE
    UPDATE public.tournaments SET
      season = '2026/27',
      is_draft = false,
      category = 'league',
      competition_type = 'league',
      format = 'league',
      rules = '{"extra_time": false, "penalty_shootout": false}'::jsonb,

      phases = '[{"id": "league_a", "label": "League phase A", "starts": "2026-11-14", "ends": "2026-12-13"}, {"id": "break", "label": "Mid-season break", "starts": "2026-12-14", "ends": "2027-01-29"}, {"id": "league_b", "label": "League phase B", "starts": "2027-01-30", "ends": "2027-02-04"}, {"id": "qf", "label": "Quarter-finals", "starts": "2027-02-06", "ends": "2027-02-09"}, {"id": "sf", "label": "Semi-finals", "starts": "2027-02-11", "ends": "2027-02-12"}, {"id": "final", "label": "Final", "starts": "2027-02-14", "ends": "2027-02-14"}]'::jsonb,
      config = '{"max_squad_size": 40, "max_subs": 9, "qualification": {"top": 8, "note": "Top 8 teams advance to the quarter-finals."}, "motto": "Competing for glory, not fighting for enemies.", "authority": "AUSA Sports Committee", "sport_secretary": "Aiyegbusi Ayokunle", "regulations": ["Arrive at the venue at least 30 minutes before kickoff.", "Only duly registered students and officially approved players may play.", "Provide a valid student ID or approved ID when requested.", "Wear approved jerseys, shorts, socks and football boots.", "Visible jersey numbers throughout; no two players in a team share a number.", "Respect referees, assistants, match commissioners and officials; no insults, threats or intimidation.", "No fighting, pushing, slapping or any physical confrontation.", "No insulting, abusive, threatening or offensive language toward anyone.", "No reckless tackles, intentional injuries or violent conduct.", "Show good sportsmanship whatever the result.", "No celebrations or gestures meant to provoke or disrespect opponents.", "Accept all referee decisions; only the captain may respectfully seek clarification.", "Substitutions only with the approval of the referee or match officials.", "No deliberate delays or refusal to restart play.", "Captains are responsible for their players'' discipline.", "Fielding an ineligible or unregistered player may bring sanctions, including forfeiture of the match.", "No team or player may abandon a match without valid reason and official approval.", "No participation under the influence of alcohol or any intoxicating substance.", "Misconduct, violence, cheating, or serious indiscipline may lead to suspension, disqualification, or other sanctions.", "The AUSA Sports Committee and designated match officials enforce these rules and have final authority."], "staff": {"FBMS": {"coach": "Gabriel", "assistant_coach": "Preseguar"}, "NURSING": {"coach": "Bolu", "staff": ["Voltage", "Richard"]}}}'::jsonb,
      title_holder_team_id = v_fosmas,
      title_holder_name = 'FOSMAS',
      title_holder_season = 'Previous'
    WHERE id = v_tourn;
  END IF;

  -- Register all 9 teams
  INSERT INTO public.tournament_teams (tournament_id, team_id)
  SELECT v_tourn, t.id
  FROM public.teams t
  JOIN public.departments d ON d.id = t.department_id
  JOIN _ausa_codes c ON c.code = d.short_code
  WHERE t.sport_id = v_sport AND t.is_guest = false AND t.deleted_at IS NULL
  ON CONFLICT (tournament_id, team_id) DO NOTHING;

  -- Replace league fixtures for this tournament (keep completed/live if any — only wipe scheduled leftovers of this seed)
  DELETE FROM public.matches
  WHERE tournament_id = v_tourn
    AND status = 'scheduled'
    AND competition_phase LIKE 'matchday_%';

  DELETE FROM public.bracket_fixtures WHERE tournament_id = v_tourn;


  INSERT INTO public.matches (tournament_id, sport_id, home_team_id, away_team_id, status, current_period, home_score, away_score, scheduled_at, scope, competition_phase, allows_extra_time, allows_penalty_shootout)
  SELECT v_tourn, v_sport, h.id, a.id, 'scheduled', 'not_started', 0, 0, x.kickoff, 'official', x.phase, false, false
  FROM (VALUES
    (1, 'FOSMAS', 'PHARMACY', timestamptz '2026-11-14 16:00:00+01', 'matchday_1'),
    (2, 'MLS', 'NURSING', timestamptz '2026-11-15 16:00:00+01', 'matchday_2'),
    (3, 'LAW', 'ENG', timestamptz '2026-11-16 16:00:00+01', 'matchday_3'),
    (4, 'FBMS', 'MEDICINE', timestamptz '2026-11-17 16:00:00+01', 'matchday_4'),
    (5, 'FOSMAS', 'NURSING', timestamptz '2026-11-18 16:00:00+01', 'matchday_5'),
    (6, 'PHARMACY', 'ENG', timestamptz '2026-11-19 16:00:00+01', 'matchday_6'),
    (7, 'MLS', 'MEDICINE', timestamptz '2026-11-20 16:00:00+01', 'matchday_7'),
    (8, 'FBMS', 'FONAS', timestamptz '2026-11-21 16:00:00+01', 'matchday_8'),
    (9, 'FOSMAS', 'ENG', timestamptz '2026-11-22 16:00:00+01', 'matchday_9'),
    (10, 'NURSING', 'MEDICINE', timestamptz '2026-11-23 16:00:00+01', 'matchday_10'),
    (11, 'MLS', 'FONAS', timestamptz '2026-11-24 16:00:00+01', 'matchday_11'),
    (12, 'LAW', 'FBMS', timestamptz '2026-11-25 16:00:00+01', 'matchday_12'),
    (13, 'FOSMAS', 'MEDICINE', timestamptz '2026-11-26 16:00:00+01', 'matchday_13'),
    (14, 'FONAS', 'NURSING', timestamptz '2026-11-27 16:00:00+01', 'matchday_14'),
    (15, 'PHARMACY', 'FBMS', timestamptz '2026-11-28 16:00:00+01', 'matchday_15'),
    (16, 'MLS', 'LAW', timestamptz '2026-11-29 16:00:00+01', 'matchday_16'),
    (17, 'MEDICINE', 'FONAS', timestamptz '2026-11-30 16:00:00+01', 'matchday_17'),
    (18, 'ENG', 'FBMS', timestamptz '2026-12-01 16:00:00+01', 'matchday_18'),
    (19, 'NURSING', 'LAW', timestamptz '2026-12-02 16:00:00+01', 'matchday_19'),
    (20, 'PHARMACY', 'MLS', timestamptz '2026-12-03 16:00:00+01', 'matchday_20'),
    (21, 'FOSMAS', 'FONAS', timestamptz '2026-12-04 16:00:00+01', 'matchday_21'),
    (22, 'MEDICINE', 'LAW', timestamptz '2026-12-05 16:00:00+01', 'matchday_22'),
    (23, 'ENG', 'MLS', timestamptz '2026-12-06 16:00:00+01', 'matchday_23'),
    (24, 'NURSING', 'PHARMACY', timestamptz '2026-12-07 16:00:00+01', 'matchday_24'),
    (25, 'FOSMAS', 'FBMS', timestamptz '2026-12-08 16:00:00+01', 'matchday_25'),
    (26, 'FONAS', 'LAW', timestamptz '2026-12-09 16:00:00+01', 'matchday_26'),
    (27, 'MEDICINE', 'PHARMACY', timestamptz '2026-12-10 16:00:00+01', 'matchday_27'),
    (28, 'ENG', 'NURSING', timestamptz '2026-12-11 16:00:00+01', 'matchday_28'),
    (29, 'FOSMAS', 'LAW', timestamptz '2026-12-12 16:00:00+01', 'matchday_29'),
    (30, 'FBMS', 'MLS', timestamptz '2026-12-13 16:00:00+01', 'matchday_30'),
    (31, 'FONAS', 'PHARMACY', timestamptz '2027-01-30 16:00:00+01', 'matchday_31'),
    (32, 'MEDICINE', 'ENG', timestamptz '2027-01-31 16:00:00+01', 'matchday_32'),
    (33, 'FOSMAS', 'MLS', timestamptz '2027-02-01 16:00:00+01', 'matchday_33'),
    (34, 'LAW', 'PHARMACY', timestamptz '2027-02-02 16:00:00+01', 'matchday_34'),
    (35, 'FBMS', 'NURSING', timestamptz '2027-02-03 16:00:00+01', 'matchday_35'),
    (36, 'FONAS', 'ENG', timestamptz '2027-02-04 16:00:00+01', 'matchday_36')
  ) AS x(n, home_code, away_code, kickoff, phase)
  JOIN public.departments hd ON hd.short_code = x.home_code
  JOIN public.teams h ON h.department_id = hd.id AND h.sport_id = v_sport AND h.is_guest = false AND h.deleted_at IS NULL
  JOIN public.departments ad ON ad.short_code = x.away_code
  JOIN public.teams a ON a.department_id = ad.id AND a.sport_id = v_sport AND a.is_guest = false AND a.deleted_at IS NULL;

  -- Knockout TBD
  INSERT INTO public.bracket_fixtures (tournament_id, round, round_label, home_display_name, away_display_name, status, bracket_mode, sort_order, scheduled_at)
  VALUES
    (v_tourn, 'quarter_final', 'Quarter-finals', '1st', '8th', 'scheduled', 'team', 0, timestamptz '2027-02-06 16:00:00+01'),
    (v_tourn, 'quarter_final', 'Quarter-finals', '2nd', '7th', 'scheduled', 'team', 1, timestamptz '2027-02-07 16:00:00+01'),
    (v_tourn, 'quarter_final', 'Quarter-finals', '3rd', '6th', 'scheduled', 'team', 2, timestamptz '2027-02-08 16:00:00+01'),
    (v_tourn, 'quarter_final', 'Quarter-finals', '4th', '5th', 'scheduled', 'team', 3, timestamptz '2027-02-09 16:00:00+01'),
    (v_tourn, 'semi_final', 'Semi-finals', 'Winner QF1', 'Winner QF4', 'scheduled', 'team', 0, timestamptz '2027-02-11 16:00:00+01'),
    (v_tourn, 'semi_final', 'Semi-finals', 'Winner QF2', 'Winner QF3', 'scheduled', 'team', 1, timestamptz '2027-02-12 16:00:00+01'),
    (v_tourn, 'final', 'Final', 'Winner SF1', 'Winner SF2', 'scheduled', 'team', 0, timestamptz '2027-02-14 16:00:00+01');


  -- Clear previous seed rosters for this tournament (seed matric prefix)
  DELETE FROM public.tournament_rosters tr
  WHERE tr.tournament_id = v_tourn
    AND tr.player_id IN (
      SELECT pl.id FROM public.players pl WHERE pl.matric_number LIKE 'seed:ausa:%'
    );

END $$;

-- Venue: Main Field for every AUSA fixture
INSERT INTO public.venues (name, location)
SELECT 'Main Field', 'Achievers University, Owo'
WHERE NOT EXISTS (
  SELECT 1 FROM public.venues v
  WHERE lower(v.name) = 'main field' AND v.deleted_at IS NULL
);

UPDATE public.matches m
SET venue_id = v.id
FROM public.venues v
JOIN public.tournaments t ON t.name = 'AUSA Interfaculty Football League'
WHERE lower(v.name) = 'main field'
  AND v.deleted_at IS NULL
  AND m.tournament_id = t.id;

-- Players + pools + rosters (outside big DECLARE for readability)
CREATE TEMP TABLE IF NOT EXISTS _ausa_players (
  team_code text NOT NULL,
  display_name text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  position text,
  matric text PRIMARY KEY
);
TRUNCATE _ausa_players;
INSERT INTO _ausa_players (team_code, display_name, first_name, last_name, position, matric) VALUES

  ('FOSMAS','David','David','.','GK','seed:ausa:fosmas:00'),
  ('FOSMAS','Kokumo','Kokumo','.','GK','seed:ausa:fosmas:01'),
  ('FOSMAS','David','David','.','DEF','seed:ausa:fosmas:02'),
  ('FOSMAS','Dino','Dino','.','DEF','seed:ausa:fosmas:03'),
  ('FOSMAS','Bello','Bello','.','DEF','seed:ausa:fosmas:04'),
  ('FOSMAS','Malik','Malik','.','DEF','seed:ausa:fosmas:05'),
  ('FOSMAS','Ezekiel','Ezekiel','.','DEF','seed:ausa:fosmas:06'),
  ('FOSMAS','Victor','Victor','.','DEF','seed:ausa:fosmas:07'),
  ('FOSMAS','Temiloluwa','Temiloluwa','.','DEF','seed:ausa:fosmas:08'),
  ('FOSMAS','Oluwajuwon','Oluwajuwon','.','DEF','seed:ausa:fosmas:09'),
  ('FOSMAS','Samuel','Samuel','.','DEF','seed:ausa:fosmas:10'),
  ('FOSMAS','Benjamin','Benjamin','.','MID','seed:ausa:fosmas:11'),
  ('FOSMAS','Marvelous','Marvelous','.','MID','seed:ausa:fosmas:12'),
  ('FOSMAS','Caleb','Caleb','.','MID','seed:ausa:fosmas:13'),
  ('FOSMAS','Ferrosse','Ferrosse','.','MID','seed:ausa:fosmas:14'),
  ('FOSMAS','Farouq','Farouq','.','MID','seed:ausa:fosmas:15'),
  ('FOSMAS','Emmanuel','Emmanuel','.','MID','seed:ausa:fosmas:16'),
  ('FOSMAS','Daniel','Daniel','.','MID','seed:ausa:fosmas:17'),
  ('FOSMAS','Peter','Peter','.','FWD','seed:ausa:fosmas:18'),
  ('FOSMAS','Oyindamola','Oyindamola','.','FWD','seed:ausa:fosmas:19'),
  ('FOSMAS','Adedayo','Adedayo','.','FWD','seed:ausa:fosmas:20'),
  ('FOSMAS','Mujeeb','Mujeeb','.','FWD','seed:ausa:fosmas:21'),
  ('MEDICINE','Nehemiah','Nehemiah','.',NULL,'seed:ausa:medicine:00'),
  ('MEDICINE','Amorim','Amorim','.',NULL,'seed:ausa:medicine:01'),
  ('MEDICINE','Trossard','Trossard','.',NULL,'seed:ausa:medicine:02'),
  ('MEDICINE','Benzema','Benzema','.',NULL,'seed:ausa:medicine:03'),
  ('MEDICINE','Adigun','Adigun','.',NULL,'seed:ausa:medicine:04'),
  ('MEDICINE','Hockage','Hockage','.',NULL,'seed:ausa:medicine:05'),
  ('MEDICINE','Boris','Boris','.',NULL,'seed:ausa:medicine:06'),
  ('MEDICINE','Flourish','Flourish','.',NULL,'seed:ausa:medicine:07'),
  ('MEDICINE','Ade Mike','Ade','Mike',NULL,'seed:ausa:medicine:08'),
  ('MEDICINE','Increase','Increase','.',NULL,'seed:ausa:medicine:09'),
  ('MEDICINE','Aboki','Aboki','.',NULL,'seed:ausa:medicine:10'),
  ('MEDICINE','Felix','Felix','.',NULL,'seed:ausa:medicine:11'),
  ('MEDICINE','Shelby','Shelby','.',NULL,'seed:ausa:medicine:12'),
  ('MEDICINE','Pastor','Pastor','.',NULL,'seed:ausa:medicine:13'),
  ('MEDICINE','Best luck','Best','luck',NULL,'seed:ausa:medicine:14'),
  ('MEDICINE','Dhele','Dhele','.',NULL,'seed:ausa:medicine:15'),
  ('MEDICINE','Kayode','Kayode','.',NULL,'seed:ausa:medicine:16'),
  ('MEDICINE','Samuel','Samuel','.',NULL,'seed:ausa:medicine:17'),
  ('MEDICINE','Abel precious','Abel','precious',NULL,'seed:ausa:medicine:18'),
  ('MEDICINE','Timothy','Timothy','.',NULL,'seed:ausa:medicine:19'),
  ('MEDICINE','Confidence','Confidence','.',NULL,'seed:ausa:medicine:20'),
  ('MEDICINE','Naija boy','Naija','boy',NULL,'seed:ausa:medicine:21'),
  ('MEDICINE','Divine','Divine','.',NULL,'seed:ausa:medicine:22'),
  ('MEDICINE','Suzzy','Suzzy','.',NULL,'seed:ausa:medicine:23'),
  ('MEDICINE','Ayeni','Ayeni','.',NULL,'seed:ausa:medicine:24'),
  ('MEDICINE','Tobi','Tobi','.',NULL,'seed:ausa:medicine:25'),
  ('MEDICINE','Semzy','Semzy','.',NULL,'seed:ausa:medicine:26'),
  ('FONAS','Edegbai Samuel Oluwasegun','Edegbai','Samuel Oluwasegun',NULL,'seed:ausa:fonas:00'),
  ('FONAS','Pluto Jude Clinton','Pluto','Jude Clinton',NULL,'seed:ausa:fonas:01'),
  ('FONAS','Alfa - Adetola Adeola','Adetola','Adeola',NULL,'seed:ausa:fonas:02'),
  ('FONAS','A.Y Adeyiolu Ayomide','A.Y','Adeyiolu Ayomide',NULL,'seed:ausa:fonas:03'),
  ('FONAS','Femino','Femino','.',NULL,'seed:ausa:fonas:04'),
  ('FONAS','Omega - Ogunkolade Oluwaseun','Ogunkolade','Oluwaseun',NULL,'seed:ausa:fonas:05'),
  ('FONAS','Yohanna Ibrahim','Yohanna','Ibrahim',NULL,'seed:ausa:fonas:06'),
  ('FONAS','Scales Aderoju Ayomide','Scales','Aderoju Ayomide',NULL,'seed:ausa:fonas:07'),
  ('FONAS','Az Olusola Ayobola','Az','Olusola Ayobola',NULL,'seed:ausa:fonas:08'),
  ('FONAS','Uche','Uche','.',NULL,'seed:ausa:fonas:09'),
  ('FONAS','Dieko','Dieko','.',NULL,'seed:ausa:fonas:10'),
  ('FONAS','Mikolo - Osatuyi Michael','Osatuyi','Michael',NULL,'seed:ausa:fonas:11'),
  ('FONAS','Scotty Ogungbemisoye Taye Emmanuel','Scotty','Ogungbemisoye Taye Emmanuel',NULL,'seed:ausa:fonas:12'),
  ('FONAS','Ruby Tomomewo Ayodeji','Ruby','Tomomewo Ayodeji',NULL,'seed:ausa:fonas:13'),
  ('FONAS','Feranmi','Feranmi','.',NULL,'seed:ausa:fonas:14'),
  ('FONAS','Prime Jonathan Princely','Prime','Jonathan Princely',NULL,'seed:ausa:fonas:15'),
  ('FONAS','Olamide','Olamide','.',NULL,'seed:ausa:fonas:16'),
  ('FONAS','Dino Bayode Daniel','Dino','Bayode Daniel',NULL,'seed:ausa:fonas:17'),
  ('FONAS','Henry Samuel','Henry','Samuel',NULL,'seed:ausa:fonas:18'),
  ('FONAS','Olamide Small','Olamide','Small',NULL,'seed:ausa:fonas:19'),
  ('FONAS','Fatoba Henry','Fatoba','Henry',NULL,'seed:ausa:fonas:20'),
  ('FONAS','Greatness Coleman Greatness','Greatness','Coleman Greatness',NULL,'seed:ausa:fonas:21'),
  ('PHARMACY','Olawale Samuel Perewarisuwotei','Olawale','Samuel Perewarisuwotei','GK','seed:ausa:pharmacy:00'),
  ('PHARMACY','Olawanle Prosperity','Olawanle','Prosperity','GK','seed:ausa:pharmacy:01'),
  ('PHARMACY','Oladipo Olawale Korede','Oladipo','Olawale Korede','DEF','seed:ausa:pharmacy:02'),
  ('PHARMACY','Olusegun Igbakanrun Desmond','Olusegun','Igbakanrun Desmond','DEF','seed:ausa:pharmacy:03'),
  ('PHARMACY','Akinwalire Boluwaji Anthony','Akinwalire','Boluwaji Anthony','DEF','seed:ausa:pharmacy:04'),
  ('PHARMACY','Akinyemi Collins Olamilekan','Akinyemi','Collins Olamilekan','DEF','seed:ausa:pharmacy:05'),
  ('PHARMACY','Alli Ayodeji','Alli','Ayodeji','DEF','seed:ausa:pharmacy:06'),
  ('PHARMACY','Uyaboerigha P. Johnson','Uyaboerigha','P. Johnson','DEF','seed:ausa:pharmacy:07'),
  ('PHARMACY','Olanrewaju Promise','Olanrewaju','Promise','DEF','seed:ausa:pharmacy:08'),
  ('PHARMACY','Abidakun Olamiposi Daniel','Abidakun','Olamiposi Daniel','DEF','seed:ausa:pharmacy:09'),
  ('PHARMACY','Ademola Habeebullahi Akorede','Ademola','Habeebullahi Akorede','MID','seed:ausa:pharmacy:10'),
  ('PHARMACY','Ogbor Divine Amarachi','Ogbor','Divine Amarachi','MID','seed:ausa:pharmacy:11'),
  ('PHARMACY','Olusola Ayomide Favour','Olusola','Ayomide Favour','MID','seed:ausa:pharmacy:12'),
  ('PHARMACY','Olanrewaju Moses Tomiwa','Olanrewaju','Moses Tomiwa','MID','seed:ausa:pharmacy:13'),
  ('PHARMACY','Omotoso Oluwatobi','Omotoso','Oluwatobi','MID','seed:ausa:pharmacy:14'),
  ('PHARMACY','Erhi Abel Oghenetega','Erhi','Abel Oghenetega','MID','seed:ausa:pharmacy:15'),
  ('PHARMACY','Odidika Ebuka Marvellous','Odidika','Ebuka Marvellous','FWD','seed:ausa:pharmacy:16'),
  ('PHARMACY','Ayeni Muhsin Adebayo','Ayeni','Muhsin Adebayo','FWD','seed:ausa:pharmacy:17'),
  ('PHARMACY','Faturoti John Eniola','Faturoti','John Eniola','FWD','seed:ausa:pharmacy:18'),
  ('PHARMACY','Dada Kayode Joshua','Dada','Kayode Joshua','FWD','seed:ausa:pharmacy:19'),
  ('PHARMACY','Fadamuro Israel','Fadamuro','Israel','FWD','seed:ausa:pharmacy:20'),
  ('PHARMACY','Oluwafemi Israel','Oluwafemi','Israel','FWD','seed:ausa:pharmacy:21'),
  ('ENG','Akeredolu Damiliar Iyanuoluwa','Akeredolu','Damiliar Iyanuoluwa','GK','seed:ausa:eng:00'),
  ('ENG','Issac','Issac','.','DEF','seed:ausa:eng:01'),
  ('ENG','Henry','Henry','.','DEF','seed:ausa:eng:02'),
  ('ENG','Olamide','Olamide','.','DEF','seed:ausa:eng:03'),
  ('ENG','Ak','Ak','.','DEF','seed:ausa:eng:04'),
  ('ENG','Donatus','Donatus','.','DEF','seed:ausa:eng:05'),
  ('ENG','Prosper','Prosper','.','DEF','seed:ausa:eng:06'),
  ('ENG','Dare','Dare','.','MID','seed:ausa:eng:07'),
  ('ENG','Eze','Eze','.','MID','seed:ausa:eng:08'),
  ('ENG','Victor','Victor','.','MID','seed:ausa:eng:09'),
  ('ENG','Ayomide','Ayomide','.','MID','seed:ausa:eng:10'),
  ('ENG','Job','Job','.','MID','seed:ausa:eng:11'),
  ('ENG','Ogbe FX','Ogbe','FX','MID','seed:ausa:eng:12'),
  ('ENG','Kile','Kile','.','MID','seed:ausa:eng:13'),
  ('ENG','Pius','Pius','.','FWD','seed:ausa:eng:14'),
  ('ENG','Kelvin','Kelvin','.','FWD','seed:ausa:eng:15'),
  ('ENG','Praise','Praise','.','FWD','seed:ausa:eng:16'),
  ('ENG','Korex','Korex','.','FWD','seed:ausa:eng:17'),
  ('ENG','Adura','Adura','.','FWD','seed:ausa:eng:18'),
  ('ENG','Timi Akomolede','Timi','Akomolede','FWD','seed:ausa:eng:19'),
  ('ENG','Timeless','Timeless','.','FWD','seed:ausa:eng:20'),
  ('ENG','Juwon','Juwon','.','FWD','seed:ausa:eng:21'),
  ('MLS','Akinsanmi Emmanuel','Akinsanmi','Emmanuel',NULL,'seed:ausa:mls:00'),
  ('MLS','Momoh Mubarak','Momoh','Mubarak',NULL,'seed:ausa:mls:01'),
  ('MLS','Adewale Opemipo Marvelous','Adewale','Opemipo Marvelous',NULL,'seed:ausa:mls:02'),
  ('MLS','Duduyemi Fiyinfoluwa','Duduyemi','Fiyinfoluwa',NULL,'seed:ausa:mls:03'),
  ('MLS','Iroju Emmanuel','Iroju','Emmanuel',NULL,'seed:ausa:mls:04'),
  ('MLS','Aiyegbusi Ayokunle','Aiyegbusi','Ayokunle',NULL,'seed:ausa:mls:05'),
  ('MLS','Ode Maintain','Ode','Maintain',NULL,'seed:ausa:mls:06'),
  ('MLS','Fakolade Samuel','Fakolade','Samuel',NULL,'seed:ausa:mls:07'),
  ('MLS','Okikiola Michael','Okikiola','Michael',NULL,'seed:ausa:mls:08'),
  ('MLS','Aladenika Bright','Aladenika','Bright',NULL,'seed:ausa:mls:09'),
  ('MLS','Eyang Victor','Eyang','Victor',NULL,'seed:ausa:mls:10'),
  ('MLS','Ige Victor','Ige','Victor',NULL,'seed:ausa:mls:11'),
  ('MLS','Akinyomade Gbemi','Akinyomade','Gbemi',NULL,'seed:ausa:mls:12'),
  ('MLS','Olasunkanmi Victor','Olasunkanmi','Victor',NULL,'seed:ausa:mls:13'),
  ('MLS','Ojagbohunmi Peter','Ojagbohunmi','Peter',NULL,'seed:ausa:mls:14'),
  ('MLS','Tobi Omotola','Tobi','Omotola',NULL,'seed:ausa:mls:15'),
  ('MLS','Olaoye Idris','Olaoye','Idris',NULL,'seed:ausa:mls:16'),
  ('MLS','Alabi Oluwatobi','Alabi','Oluwatobi',NULL,'seed:ausa:mls:17'),
  ('MLS','Bakare Ayomide','Bakare','Ayomide',NULL,'seed:ausa:mls:18'),
  ('MLS','Ajetunmobi Shadrach','Ajetunmobi','Shadrach',NULL,'seed:ausa:mls:19'),
  ('MLS','Idemudia Osas','Idemudia','Osas',NULL,'seed:ausa:mls:20'),
  ('MLS','Yambode Eriayo','Yambode','Eriayo',NULL,'seed:ausa:mls:21'),
  ('LAW','Ekiti','Ekiti','.','GK','seed:ausa:law:00'),
  ('LAW','Emmanuel','Emmanuel','.','GK','seed:ausa:law:01'),
  ('LAW','Monday','Monday','.',NULL,'seed:ausa:law:02'),
  ('LAW','Beloved','Beloved','.',NULL,'seed:ausa:law:03'),
  ('LAW','David','David','.',NULL,'seed:ausa:law:04'),
  ('LAW','Goodness','Goodness','.',NULL,'seed:ausa:law:05'),
  ('LAW','Daniel','Daniel','.',NULL,'seed:ausa:law:06'),
  ('LAW','Dominion','Dominion','.',NULL,'seed:ausa:law:07'),
  ('LAW','OPS','OPS','.',NULL,'seed:ausa:law:08'),
  ('LAW','Deli','Deli','.',NULL,'seed:ausa:law:09'),
  ('LAW','Francis','Francis','.',NULL,'seed:ausa:law:10'),
  ('LAW','Demola','Demola','.',NULL,'seed:ausa:law:11'),
  ('LAW','Clement','Clement','.',NULL,'seed:ausa:law:12'),
  ('LAW','Farouq','Farouq','.',NULL,'seed:ausa:law:13'),
  ('LAW','Opemiposi','Opemiposi','.',NULL,'seed:ausa:law:14'),
  ('LAW','Olumide','Olumide','.',NULL,'seed:ausa:law:15'),
  ('LAW','Saint','Saint','.',NULL,'seed:ausa:law:16'),
  ('LAW','Tunde','Tunde','.',NULL,'seed:ausa:law:17'),
  ('LAW','Collins','Collins','.',NULL,'seed:ausa:law:18'),
  ('LAW','Seyi','Seyi','.',NULL,'seed:ausa:law:19'),
  ('LAW','Oscar','Oscar','.',NULL,'seed:ausa:law:20'),
  ('LAW','Raphael','Raphael','.',NULL,'seed:ausa:law:21'),
  ('NURSING','Ayanfe','Ayanfe','.','GK','seed:ausa:nursing:00'),
  ('NURSING','Dennis','Dennis','.','DEF','seed:ausa:nursing:01'),
  ('NURSING','Young John','Young','John','DEF','seed:ausa:nursing:02'),
  ('NURSING','Blaq','Blaq','.','DEF','seed:ausa:nursing:03'),
  ('NURSING','Kay','Kay','.','DEF','seed:ausa:nursing:04'),
  ('NURSING','Gengstu','Gengstu','.','DEF','seed:ausa:nursing:05'),
  ('NURSING','Muller','Muller','.','DEF','seed:ausa:nursing:06'),
  ('NURSING','Zuko','Zuko','.','DEF','seed:ausa:nursing:07'),
  ('NURSING','Juwon','Juwon','.','DEF','seed:ausa:nursing:08'),
  ('NURSING','Highlander','Highlander','.','DEF','seed:ausa:nursing:09'),
  ('NURSING','Marcus','Marcus','.','MID','seed:ausa:nursing:10'),
  ('NURSING','Grown','Grown','.','MID','seed:ausa:nursing:11'),
  ('NURSING','Paul','Paul','.','MID','seed:ausa:nursing:12'),
  ('NURSING','Bobby','Bobby','.','MID','seed:ausa:nursing:13'),
  ('NURSING','Timmy','Timmy','.','MID','seed:ausa:nursing:14'),
  ('NURSING','Alex','Alex','.','MID','seed:ausa:nursing:15'),
  ('NURSING','Elvis','Elvis','.','MID','seed:ausa:nursing:16'),
  ('NURSING','Murewa','Murewa','.','FWD','seed:ausa:nursing:17'),
  ('NURSING','Chase','Chase','.','FWD','seed:ausa:nursing:18'),
  ('NURSING','Nath','Nath','.','FWD','seed:ausa:nursing:19'),
  ('NURSING','Francis','Francis','.','FWD','seed:ausa:nursing:20'),
  ('NURSING','Igbin','Igbin','.','FWD','seed:ausa:nursing:21'),
  ('FBMS','Bernard','Bernard','.','GK','seed:ausa:fbms:00'),
  ('FBMS','Boli Is Life','Boli','Is Life','DEF','seed:ausa:fbms:01'),
  ('FBMS','Tunde','Tunde','.','DEF','seed:ausa:fbms:02'),
  ('FBMS','Joshua','Joshua','.','DEF','seed:ausa:fbms:03'),
  ('FBMS','Ay-Black','Ay-Black','.','DEF','seed:ausa:fbms:04'),
  ('FBMS','Emmanuel','Emmanuel','.','DEF','seed:ausa:fbms:05'),
  ('FBMS','Johnson','Johnson','.','DEF','seed:ausa:fbms:06'),
  ('FBMS','Saheed','Saheed','.','DEF','seed:ausa:fbms:07'),
  ('FBMS','Demah','Demah','.','DEF','seed:ausa:fbms:08'),
  ('FBMS','Emperor','Emperor','.','MID','seed:ausa:fbms:09'),
  ('FBMS','Chris','Chris','.','MID','seed:ausa:fbms:10'),
  ('FBMS','Ogba','Ogba','.','MID','seed:ausa:fbms:11'),
  ('FBMS','Cama','Cama','.','MID','seed:ausa:fbms:12'),
  ('FBMS','Zaa','Zaa','.','MID','seed:ausa:fbms:13'),
  ('FBMS','Dammy','Dammy','.','MID','seed:ausa:fbms:14'),
  ('FBMS','Kayode','Kayode','.','MID','seed:ausa:fbms:15'),
  ('FBMS','Mosope','Mosope','.','MID','seed:ausa:fbms:16'),
  ('FBMS','Smart','Smart','.','FWD','seed:ausa:fbms:17'),
  ('FBMS','Glory','Glory','.','FWD','seed:ausa:fbms:18'),
  ('FBMS','Onana','Onana','.','FWD','seed:ausa:fbms:19'),
  ('FBMS','KDB','KDB','.','FWD','seed:ausa:fbms:20'),
  ('FBMS','Saheed','Saheed','.','FWD','seed:ausa:fbms:21');

DO $$
DECLARE
  v_sport uuid;
  v_tourn uuid;
  r record;
  v_dept uuid;
  v_team uuid;
  v_player uuid;
BEGIN
  SELECT id INTO v_sport FROM public.sports WHERE lower(name) IN ('football','soccer') LIMIT 1;
  SELECT id INTO v_tourn FROM public.tournaments WHERE name = 'AUSA Interfaculty Football League' AND sport_id = v_sport LIMIT 1;

  -- Wipe prior AUSA seed players (matric scheme is compact ≤50; clears partial failed runs)
  DELETE FROM public.tournament_rosters
  WHERE player_id IN (SELECT id FROM public.players WHERE matric_number LIKE 'seed:ausa:%');
  DELETE FROM public.player_sport_registry
  WHERE player_id IN (SELECT id FROM public.players WHERE matric_number LIKE 'seed:ausa:%');
  DELETE FROM public.players WHERE matric_number LIKE 'seed:ausa:%';

  FOR r IN SELECT * FROM _ausa_players LOOP
    SELECT id INTO v_dept FROM public.departments WHERE short_code = r.team_code;
    SELECT id INTO v_team FROM public.teams
    WHERE department_id = v_dept AND sport_id = v_sport AND is_guest = false AND deleted_at IS NULL LIMIT 1;

    SELECT id INTO v_player FROM public.players WHERE matric_number = r.matric;
    IF v_player IS NULL THEN
      INSERT INTO public.players (department_id, first_name, last_name, matric_number, position)
      VALUES (v_dept, r.first_name, r.last_name, r.matric, r.position)
      RETURNING id INTO v_player;
    ELSE
      UPDATE public.players SET
        department_id = v_dept,
        first_name = r.first_name,
        last_name = r.last_name,
        position = COALESCE(r.position, position)
      WHERE id = v_player;
    END IF;

    INSERT INTO public.player_sport_registry (player_id, team_id, is_active, squad_role)
    VALUES (v_player, v_team, true, COALESCE(r.position, 'Squad'))
    ON CONFLICT (player_id, team_id) DO UPDATE
      SET is_active = true, squad_role = EXCLUDED.squad_role;

    INSERT INTO public.tournament_rosters (tournament_id, team_id, player_id)
    VALUES (v_tourn, v_team, v_player)
    ON CONFLICT (tournament_id, player_id) DO NOTHING;
  END LOOP;
END $$;

-- ── Verification ────────────────────────────────────────────────────────────
SELECT 'tournament' AS what, t.id::text, t.name, t.season, t.is_draft::text
FROM public.tournaments t WHERE t.name = 'AUSA Interfaculty Football League'
UNION ALL
SELECT 'teams', count(*)::text, '', '', ''
FROM public.tournament_teams tt
JOIN public.tournaments t ON t.id = tt.tournament_id
WHERE t.name = 'AUSA Interfaculty Football League'
UNION ALL
SELECT 'matches', count(*)::text, '', '', ''
FROM public.matches m
JOIN public.tournaments t ON t.id = m.tournament_id
WHERE t.name = 'AUSA Interfaculty Football League' AND m.competition_phase LIKE 'matchday_%'
UNION ALL
SELECT 'bracket', count(*)::text, '', '', ''
FROM public.bracket_fixtures bf
JOIN public.tournaments t ON t.id = bf.tournament_id
WHERE t.name = 'AUSA Interfaculty Football League'
UNION ALL
SELECT 'roster '||d.short_code, count(*)::text, '', '', ''
FROM public.tournament_rosters tr
JOIN public.tournaments t ON t.id = tr.tournament_id
JOIN public.departments d ON d.id = (SELECT department_id FROM public.teams WHERE id = tr.team_id)
WHERE t.name = 'AUSA Interfaculty Football League'
GROUP BY d.short_code
ORDER BY 1;
