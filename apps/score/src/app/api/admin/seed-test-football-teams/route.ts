import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { getScoreDemoMode } from "@/lib/data/mode";
import { addGuestTeam } from "@/lib/data/demo-guest-teams";
import { resolveSportUuid } from "@/lib/data/sport-ids";

const TEAMS = [
  {
    name: "Test United",
    institution: "AU Score Lab",
    logo_url: "/logos/test-united.svg",
    code: "TUN",
    players: [
      ["Kai", "Obasi", "GK"],
      ["Jonah", "Reed", "DF"],
      ["Malik", "Owens", "DF"],
      ["Felix", "Grant", "DF"],
      ["Omar", "Diaz", "DF"],
      ["Noah", "Park", "MF"],
      ["Leo", "Kim", "MF"],
      ["Ethan", "Brooks", "MF"],
      ["Caleb", "Ibrahim", "FW"],
      ["Miles", "Turner", "FW"],
      ["Ryan", "Cole", "FW"],
      ["Sam", "Vargas", "MF"],
      ["Drew", "Hale", "DF"],
      ["Ben", "Okoye", "GK"],
    ],
  },
  {
    name: "Test Athletic",
    institution: "AU Score Lab",
    logo_url: "/logos/test-athletic.svg",
    code: "TAC",
    players: [
      ["Amir", "Shah", "GK"],
      ["Theo", "Banks", "DF"],
      ["Luca", "Moretti", "DF"],
      ["Hugo", "Santos", "DF"],
      ["Ivan", "Petrov", "DF"],
      ["Marco", "Silva", "MF"],
      ["Yusuf", "Ali", "MF"],
      ["Nate", "Chen", "MF"],
      ["Alex", "Rivera", "FW"],
      ["Jude", "Walsh", "FW"],
      ["Chris", "Nguyen", "FW"],
      ["Owen", "Price", "MF"],
      ["Finn", "Doyle", "DF"],
      ["Gabe", "Moss", "GK"],
    ],
  },
] as const;

/**
 * Idempotent seed: two football guest sides with crest logos + 14-player pools
 * so keepers can schedule / kick off without real faculty squads.
 */
export async function POST() {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    const created = TEAMS.map((t) =>
      addGuestTeam({
        name: t.name,
        sport: "football",
        institution: t.institution,
        logo_url: t.logo_url,
      })
    );
    return NextResponse.json({
      ok: true,
      mode: "demo",
      teams: created.map((t) => ({ id: t.id, name: t.name, logo_url: t.logo_url })),
      note: "Demo mode — guest teams only (no player rows).",
    });
  }

  const supabase = await createClient();
  const sportUuid = await resolveSportUuid(supabase, "sport-football");
  if (typeof sportUuid !== "string") {
    return NextResponse.json({ error: sportUuid.error }, { status: 400 });
  }

  const { data: dept } = (await supabase
    .from("departments")
    .select("id")
    .order("name")
    .limit(1)
    .maybeSingle()) as { data: { id: string } | null };

  if (!dept?.id) {
    return NextResponse.json(
      { error: "No department found — add at least one department before seeding test players." },
      { status: 400 }
    );
  }

  const results: Array<{
    team_id: string;
    name: string;
    logo_url: string | null;
    players: number;
  }> = [];

  for (const t of TEAMS) {
    const { data: existing } = (await supabase
      .from("teams")
      .select("id, name, logo_url")
      .eq("is_guest", true)
      .ilike("name", t.name)
      .is("deleted_at", null)
      .maybeSingle()) as { data: { id: string; name: string; logo_url: string | null } | null };

    let teamId = existing?.id;
    if (!teamId) {
      const { data: created, error } = (await (supabase.from("teams") as ReturnType<
        typeof supabase.from
      >)
        .insert({
          name: t.name,
          sport_id: sportUuid,
          department_id: null,
          is_guest: true,
          institution: t.institution,
          logo_url: t.logo_url,
        } as Record<string, unknown>)
        .select("id, name, logo_url")
        .single()) as {
        data: { id: string; name: string; logo_url: string | null } | null;
        error: { message: string } | null;
      };
      if (error || !created) {
        return NextResponse.json(
          { error: error?.message ?? `Could not create ${t.name}` },
          { status: 400 }
        );
      }
      teamId = created.id;
    } else {
      await (supabase.from("teams") as ReturnType<typeof supabase.from>)
        .update({
          logo_url: t.logo_url,
          institution: t.institution,
        } as Record<string, unknown>)
        .eq("id", teamId);
    }

    let playerCount = 0;
    for (let i = 0; i < t.players.length; i++) {
      const [first, last, position] = t.players[i];
      const jersey = i + 1;
      const matric = `TEST-${t.code}-${String(jersey).padStart(2, "0")}`;

      const { data: existingPlayer } = (await supabase
        .from("players")
        .select("id")
        .eq("matric_number", matric)
        .maybeSingle()) as { data: { id: string } | null };

      let playerId = existingPlayer?.id;
      if (!playerId) {
        const { data: createdPlayer, error: playerErr } = (await (supabase.from(
          "players"
        ) as ReturnType<typeof supabase.from>)
          .insert({
            department_id: dept.id,
            first_name: first,
            last_name: last,
            matric_number: matric,
            position,
            avatar_url: null,
          } as Record<string, unknown>)
          .select("id")
          .single()) as { data: { id: string } | null; error: { message: string } | null };
        if (playerErr || !createdPlayer) {
          return NextResponse.json(
            { error: playerErr?.message ?? `Could not create player ${first} ${last}` },
            { status: 400 }
          );
        }
        playerId = createdPlayer.id;
      }

      const { error: regErr } = (await (supabase.from("player_sport_registry") as ReturnType<
        typeof supabase.from
      >).upsert(
        {
          player_id: playerId,
          team_id: teamId,
          jersey_number: jersey,
          is_active: true,
          squad_role: jersey <= 11 ? "Starting XI" : "Bench",
        } as Record<string, unknown>,
        { onConflict: "player_id,team_id" }
      )) as { error: { message: string } | null };

      if (regErr) {
        return NextResponse.json({ error: regErr.message }, { status: 400 });
      }
      playerCount++;
    }

    results.push({
      team_id: teamId,
      name: t.name,
      logo_url: t.logo_url,
      players: playerCount,
    });
  }

  return NextResponse.json({ ok: true, mode: "live", teams: results });
}
