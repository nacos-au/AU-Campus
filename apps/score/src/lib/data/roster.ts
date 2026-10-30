import type { Department, Player, Team } from "@/lib/types/database";
import { getScoreDemoMode } from "@/lib/data/mode";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { createClient } from "@/lib/supabase/server";
import { resolveSportUuid } from "@/lib/data/sport-ids";
import {
  importDemoRoster,
  listDemoDepartments,
  listDemoRosterPlayers,
  listDemoTeamsWithGuests,
  updateDemoPlayerAvatar,
  updateDemoTeamLogo,
  type RosterImportInput,
  type RosterImportResult,
  type RosterPlayerRow,
} from "@/lib/data/demo-roster";
import { sportToDbId, type SportId } from "@/lib/utils/sport";

export type { RosterImportInput, RosterImportResult, RosterPlayerRow } from "@/lib/data/demo-roster";

async function inDemo() {
  return !hasSupabaseConfig() || (await getScoreDemoMode());
}

/** All teams that can take part in a sport — department sides plus guests. */
export async function fetchTeamsForSport(sport: SportId): Promise<Team[]> {
  const slug = sportToDbId(sport);
  if (await inDemo()) return listDemoTeamsWithGuests(slug);

  const supabase = await createClient();
  const sportUuid = await resolveSportUuid(supabase, slug);
  if (typeof sportUuid !== "string") return listDemoTeamsWithGuests(slug);

  const { data } = (await supabase
    .from("teams")
    .select("*, department:departments(*)")
    .eq("sport_id", sportUuid)
    .is("deleted_at", null)
    .order("name")) as { data: Team[] | null };

  return data ?? [];
}

export async function fetchDepartments(): Promise<Department[]> {
  if (await inDemo()) return listDemoDepartments();
  const supabase = await createClient();
  const { data } = (await supabase.from("departments").select("*").order("short_code")) as {
    data: Department[] | null;
  };
  return data ?? [];
}

function codeFromName(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 6);
}

/**
 * Bulk onboarding. Idempotent: departments match on short code, teams on
 * (department, sport) or name, players on matric number then full name.
 */
export async function importRoster(input: RosterImportInput): Promise<RosterImportResult | { error: string }> {
  if (await inDemo()) return importDemoRoster(input);

  const supabase = await createClient();
  const sportUuid = await resolveSportUuid(supabase, input.sport_id);
  if (typeof sportUuid !== "string") return sportUuid;

  const result: RosterImportResult = {
    departments_created: 0,
    teams_created: 0,
    teams_existing: 0,
    players_created: 0,
    players_existing: 0,
    registrations: 0,
    errors: [],
  };

  // ── Departments ──────────────────────────────────────────────────────
  const { data: deptRows } = (await supabase.from("departments").select("id, name, short_code")) as {
    data: Array<{ id: string; name: string; short_code: string }> | null;
  };
  const deptByCode = new Map((deptRows ?? []).map((d) => [d.short_code.toUpperCase(), d]));

  async function ensureDepartment(code: string, name?: string | null) {
    const key = code.toUpperCase();
    const found = deptByCode.get(key);
    if (found) return found;
    const { data, error } = (await (supabase.from("departments") as ReturnType<typeof supabase.from>)
      .insert({ name: name?.trim() || key, short_code: key } as Record<string, unknown>)
      .select("id, name, short_code")
      .single()) as { data: { id: string; name: string; short_code: string } | null; error: { message: string } | null };
    if (error || !data) {
      result.errors.push(`Department ${key}: ${error?.message ?? "not created"}`);
      return null;
    }
    deptByCode.set(key, data);
    result.departments_created += 1;
    return data;
  }

  // ── Teams ────────────────────────────────────────────────────────────
  const { data: teamRows } = (await supabase
    .from("teams")
    .select("id, name, department_id, is_guest")
    .eq("sport_id", sportUuid)
    .is("deleted_at", null)) as {
    data: Array<{ id: string; name: string; department_id: string | null; is_guest: boolean }> | null;
  };
  const teams = [...(teamRows ?? [])];

  for (const t of input.teams) {
    const name = t.name.trim();
    if (!name) continue;
    const dept = await ensureDepartment(t.department_code || codeFromName(name), t.department_name);
    if (!dept) continue;
    const dup = teams.find(
      (x) => x.name.toLowerCase() === name.toLowerCase() || (!x.is_guest && x.department_id === dept.id)
    );
    if (dup) {
      result.teams_existing += 1;
      continue;
    }
    const { data, error } = (await (supabase.from("teams") as ReturnType<typeof supabase.from>)
      .insert({ name, department_id: dept.id, sport_id: sportUuid, is_guest: false } as Record<string, unknown>)
      .select("id, name, department_id, is_guest")
      .single()) as { data: (typeof teams)[number] | null; error: { message: string } | null };
    if (error || !data) {
      result.errors.push(`Team ${name}: ${error?.message ?? "not created"}`);
      continue;
    }
    teams.push(data);
    result.teams_created += 1;
  }

  // ── Players ──────────────────────────────────────────────────────────
  if (input.players.length) {
    const { data: playerRows } = (await supabase
      .from("players")
      .select("id, first_name, last_name, matric_number, department_id")) as {
      data: Array<{ id: string; first_name: string; last_name: string; matric_number: string | null; department_id: string }> | null;
    };
    const players = [...(playerRows ?? [])];

    const teamIds = teams.map((t) => t.id);
    const { data: regRows } = teamIds.length
      ? ((await supabase
          .from("player_sport_registry")
          .select("player_id, team_id")
          .in("team_id", teamIds)) as { data: Array<{ player_id: string; team_id: string }> | null })
      : { data: [] };
    const registered = new Set((regRows ?? []).map((r) => `${r.player_id}:${r.team_id}`));

    for (const p of input.players) {
      const first = p.first_name.trim();
      const last = p.last_name.trim();
      if (!first && !last) continue;

      const team =
        (p.team_id ? teams.find((t) => t.id === p.team_id) : undefined) ??
        (p.team_name ? teams.find((t) => t.name.toLowerCase() === p.team_name!.trim().toLowerCase()) : undefined);
      if (!team) {
        result.errors.push(`${first} ${last}: no team matched “${p.team_name ?? p.team_id ?? "—"}”`);
        continue;
      }
      if (!team.department_id) {
        result.errors.push(`${first} ${last}: guest teams can’t hold AU player records`);
        continue;
      }

      const matric = p.matric_number?.trim().toUpperCase() || null;
      let player =
        (matric && players.find((x) => x.matric_number?.toUpperCase() === matric)) ||
        players.find(
          (x) =>
            x.first_name.toLowerCase() === first.toLowerCase() &&
            x.last_name.toLowerCase() === last.toLowerCase() &&
            x.department_id === team.department_id
        );

      if (player) {
        result.players_existing += 1;
      } else {
        const { data, error } = (await (supabase.from("players") as ReturnType<typeof supabase.from>)
          .insert({
            first_name: first,
            last_name: last,
            matric_number: matric,
            department_id: team.department_id,
            position: p.position ?? null,
          } as Record<string, unknown>)
          .select("id, first_name, last_name, matric_number, department_id")
          .single()) as { data: (typeof players)[number] | null; error: { message: string } | null };
        if (error || !data) {
          result.errors.push(`${first} ${last}: ${error?.message ?? "not created"}`);
          continue;
        }
        players.push(data);
        player = data;
        result.players_created += 1;
      }

      const key = `${player.id}:${team.id}`;
      if (registered.has(key)) continue;
      const { error: regErr } = (await (supabase.from("player_sport_registry") as ReturnType<typeof supabase.from>)
        .insert({
          player_id: player.id,
          team_id: team.id,
          jersey_number: p.jersey_number ?? null,
          squad_role: p.position ?? null,
          is_active: true,
        } as Record<string, unknown>)) as { error: { message: string } | null };
      if (regErr) {
        result.errors.push(`${first} ${last}: ${regErr.message}`);
        continue;
      }
      registered.add(key);
      result.registrations += 1;
    }
  }

  return result;
}

export async function fetchPlayersForSport(
  sport: SportId,
  teamId?: string | null
): Promise<RosterPlayerRow[]> {
  const slug = sportToDbId(sport);
  if (await inDemo()) return listDemoRosterPlayers(slug, teamId);

  const supabase = await createClient();
  const sportUuid = await resolveSportUuid(supabase, slug);
  if (typeof sportUuid !== "string") return listDemoRosterPlayers(slug, teamId);

  let teamQuery = supabase
    .from("teams")
    .select("id, name")
    .eq("sport_id", sportUuid)
    .is("deleted_at", null);
  if (teamId) teamQuery = teamQuery.eq("id", teamId);
  const { data: teamRows } = (await teamQuery) as { data: Array<{ id: string; name: string }> | null };
  const teams = teamRows ?? [];
  if (!teams.length) return [];

  const teamIds = teams.map((t) => t.id);
  const teamName = new Map(teams.map((t) => [t.id, t.name]));

  const { data: regs } = (await supabase
    .from("player_sport_registry")
    .select("player_id, team_id, jersey_number, squad_role, player:players(*)")
    .in("team_id", teamIds)
    .eq("is_active", true)) as {
    data: Array<{
      player_id: string;
      team_id: string;
      jersey_number: number | null;
      squad_role: string | null;
      player: Player | null;
    }> | null;
  };

  return (regs ?? [])
    .filter((r) => r.player)
    .map((r) => ({
      ...(r.player as Player),
      team_id: r.team_id,
      team_name: teamName.get(r.team_id) ?? "—",
      jersey_number: r.jersey_number,
      squad_role: r.squad_role,
    }))
    .sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name));
}

export async function updateTeamLogo(
  teamId: string,
  logoUrl: string
): Promise<Team | { error: string }> {
  if (await inDemo()) {
    const t = updateDemoTeamLogo(teamId, logoUrl);
    return t ?? { error: "Team not found" };
  }
  const supabase = await createClient();
  const { data, error } = (await (supabase.from("teams") as ReturnType<typeof supabase.from>)
    .update({ logo_url: logoUrl } as Record<string, unknown>)
    .eq("id", teamId)
    .select("*, department:departments(*)")
    .single()) as { data: Team | null; error: { message: string } | null };
  if (error || !data) return { error: error?.message ?? "Team not found" };
  return data;
}

export async function updatePlayerAvatar(
  playerId: string,
  avatarUrl: string
): Promise<Player | { error: string }> {
  if (await inDemo()) {
    const p = updateDemoPlayerAvatar(playerId, avatarUrl);
    return p ?? { error: "Player not found" };
  }
  const supabase = await createClient();
  const { data, error } = (await (supabase.from("players") as ReturnType<typeof supabase.from>)
    .update({ avatar_url: avatarUrl } as Record<string, unknown>)
    .eq("id", playerId)
    .select("*")
    .single()) as { data: Player | null; error: { message: string } | null };
  if (error || !data) return { error: error?.message ?? "Player not found" };
  return data;
}
