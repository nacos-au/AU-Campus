/**
 * AU Score Database Seed Script
 *
 * Populates Supabase with demo departments, teams, players, and matches.
 * Requires SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
 *
 * Usage:
 *   1. Copy .env.example to .env.local and fill in Supabase credentials
 *   2. Run migrations first (supabase db push or SQL Editor)
 *   3. npm run db:seed
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEPARTMENTS = [
  { name: "Computer Science", short_code: "CSC" },
  { name: "Mechanical Engineering", short_code: "MEC" },
  { name: "Electrical Engineering", short_code: "EEE" },
  { name: "Biological Sciences", short_code: "BIO" },
  { name: "Law", short_code: "LAW" },
  { name: "Medicine", short_code: "MED" },
];

const SPORTS = [
  { name: "Football", type: "team", score_type: "points" },
  { name: "Basketball", type: "team", score_type: "points" },
  { name: "Lawn Tennis", type: "individual", score_type: "sets" },
  { name: "Track & Field", type: "individual", score_type: "time" },
  { name: "Volleyball", type: "team", score_type: "sets" },
];

const PLAYERS_BY_DEPT: Record<string, Array<{ first_name: string; last_name: string; matric_number: string; position: string }>> = {
  CSC: [
    { first_name: "Adaeze", last_name: "Okonkwo", matric_number: "AU/CS/2022/0142", position: "Forward" },
    { first_name: "Chidi", last_name: "Eze", matric_number: "AU/CS/2021/0089", position: "Midfielder" },
    { first_name: "Ngozi", last_name: "Adeyemi", matric_number: "AU/CS/2023/0201", position: "Goalkeeper" },
  ],
  MEC: [
    { first_name: "Tunde", last_name: "Bakare", matric_number: "AU/ME/2022/0067", position: "Forward" },
    { first_name: "Fatima", last_name: "Ibrahim", matric_number: "AU/ME/2021/0034", position: "Defender" },
  ],
  EEE: [
    { first_name: "Emeka", last_name: "Nwosu", matric_number: "AU/EE/2022/0118", position: "Midfielder" },
  ],
  BIO: [
    { first_name: "Amina", last_name: "Bello", matric_number: "AU/BS/2023/0156", position: "Forward" },
  ],
  LAW: [
    { first_name: "Kelechi", last_name: "Okafor", matric_number: "AU/LW/2022/0078", position: "Defender" },
  ],
};

async function seed() {
  console.log("🌱 Seeding AU Score database...\n");

  // Departments
  const { data: departments, error: deptError } = await supabase
    .from("departments")
    .upsert(DEPARTMENTS, { onConflict: "short_code" })
    .select();
  if (deptError) throw deptError;
  console.log(`✓ ${departments!.length} departments`);

  const deptMap = Object.fromEntries(departments!.map((d) => [d.short_code, d.id]));

  // Sports
  const { data: sports, error: sportError } = await supabase
    .from("sports")
    .upsert(SPORTS, { onConflict: "name" })
    .select();
  if (sportError) throw sportError;
  console.log(`✓ ${sports!.length} sports`);

  const football = sports!.find((s) => s.name === "Football")!;
  const basketball = sports!.find((s) => s.name === "Basketball")!;

  // Teams
  const teams = [
    { department_id: deptMap.CSC, sport_id: football.id, name: "CSC FC" },
    { department_id: deptMap.MEC, sport_id: football.id, name: "MEC Giants" },
    { department_id: deptMap.EEE, sport_id: football.id, name: "EEE Strikers" },
    { department_id: deptMap.BIO, sport_id: football.id, name: "Bio Wolves" },
    { department_id: deptMap.LAW, sport_id: football.id, name: "Law Barristers" },
    { department_id: deptMap.CSC, sport_id: basketball.id, name: "CSC Hoops" },
    { department_id: deptMap.MED, sport_id: basketball.id, name: "Med Court Kings" },
  ];

  const { data: insertedTeams, error: teamError } = await supabase
    .from("teams")
    .upsert(teams, { onConflict: "department_id,sport_id" })
    .select();
  if (teamError) throw teamError;
  console.log(`✓ ${insertedTeams!.length} teams`);

  // Players
  const playerRows = Object.entries(PLAYERS_BY_DEPT).flatMap(([code, players]) =>
    players.map((p) => ({
      ...p,
      department_id: deptMap[code],
    }))
  );

  const { data: players, error: playerError } = await supabase
    .from("players")
    .upsert(playerRows, { onConflict: "matric_number" })
    .select();
  if (playerError) throw playerError;
  console.log(`✓ ${players!.length} players`);

  // Player sport registry
  const cscFc = insertedTeams!.find((t) => t.name === "CSC FC")!;
  const registry = players!
    .filter((p) => p.department_id === deptMap.CSC)
    .map((p, i) => ({
      player_id: p.id,
      team_id: cscFc.id,
      jersey_number: [9, 10, 1][i] ?? i + 1,
    }));

  if (registry.length > 0) {
    const { error: regError } = await supabase
      .from("player_sport_registry")
      .upsert(registry, { onConflict: "player_id,team_id" });
    if (regError) throw regError;
    console.log(`✓ ${registry.length} player registrations`);
  }

  // Tournament
  const { data: tournament, error: tournError } = await supabase
    .from("tournaments")
    .insert({
      name: "Inter-Faculty League 2026",
      sport_id: football.id,
      category: "league",
      season: "2025/26",
      rules: { extra_time: false, penalty_shootout: false },
    })
    .select()
    .single();
  if (tournError) throw tournError;
  console.log(`✓ Tournament: ${tournament.name}`);

  const cscTeam = insertedTeams!.find((t) => t.name === "CSC FC")!;
  const mecTeam = insertedTeams!.find((t) => t.name === "MEC Giants")!;
  const eeeTeam = insertedTeams!.find((t) => t.name === "EEE Strikers")!;
  const bioTeam = insertedTeams!.find((t) => t.name === "Bio Wolves")!;

  // Matches
  const now = new Date();
  const matches = [
    {
      tournament_id: tournament.id,
      sport_id: football.id,
      home_team_id: cscTeam.id,
      away_team_id: mecTeam.id,
      status: "live",
      current_period: "half_1",
      home_score: 2,
      away_score: 1,
      scheduled_at: now.toISOString(),
      started_at: now.toISOString(),
      win_probability: {
        algo: { home: 52, draw: 22, away: 26 },
        votes: { home: 68, draw: 12, away: 20 },
      },
    },
    {
      tournament_id: tournament.id,
      sport_id: football.id,
      home_team_id: eeeTeam.id,
      away_team_id: bioTeam.id,
      status: "scheduled",
      current_period: "not_started",
      scheduled_at: new Date(now.getTime() + 86400000).toISOString(),
      win_probability: {
        algo: { home: 41, draw: 25, away: 34 },
        votes: { home: 55, draw: 18, away: 27 },
      },
    },
  ];

  const { data: insertedMatches, error: matchError } = await supabase
    .from("matches")
    .insert(matches)
    .select();
  if (matchError) throw matchError;
  console.log(`✓ ${insertedMatches!.length} matches`);

  // Sample events for live match
  const liveMatch = insertedMatches!.find((m) => m.status === "live")!;
  const adaeze = players!.find((p) => p.first_name === "Adaeze")!;
  const chidi = players!.find((p) => p.first_name === "Chidi")!;
  const tunde = players!.find((p) => p.first_name === "Tunde")!;

  const events = [
    { match_id: liveMatch.id, team_id: cscTeam.id, player_id: adaeze.id, event_type: "goal", period: "half_1", match_time: "12:34", details: { assist_player_id: chidi.id } },
    { match_id: liveMatch.id, team_id: mecTeam.id, player_id: tunde.id, event_type: "goal", period: "half_1", match_time: "28:10" },
    { match_id: liveMatch.id, team_id: cscTeam.id, player_id: adaeze.id, event_type: "goal", period: "half_1", match_time: "35:42" },
  ];

  const { error: eventError } = await supabase.from("match_events").insert(events);
  if (eventError) throw eventError;
  console.log(`✓ ${events.length} match events`);

  // Elo ratings
  const eloTeams = [cscTeam, mecTeam, eeeTeam, bioTeam];
  const eloRows = eloTeams.map((t, i) => ({
    team_id: t.id,
    tournament_id: tournament.id,
    rating: [1080, 1045, 1010, 985][i],
  }));

  const { error: eloError } = await supabase
    .from("team_elo_ratings")
    .upsert(eloRows, { onConflict: "team_id,tournament_id" });
  if (eloError) throw eloError;
  console.log(`✓ ${eloRows.length} Elo ratings`);

  console.log("\n✅ Seed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
