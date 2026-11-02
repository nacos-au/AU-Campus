import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { getScoreDemoMode } from "@/lib/data/mode";

export type SuspensionRow = {
  id: string;
  player_id: string;
  reason: string;
  suspended_from: string;
  suspended_until: string | null;
  is_active: boolean;
  created_at: string | null;
  player_name: string;
  matric_number: string | null;
};

export async function listSuspensions(opts?: {
  activeOnly?: boolean;
}): Promise<SuspensionRow[]> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) return [];

  const supabase = await createClient();
  let query = supabase
    .from("player_suspensions")
    .select(
      "id, player_id, reason, suspended_from, suspended_until, is_active, created_at, player:players(first_name, last_name, matric_number)"
    )
    .order("suspended_from", { ascending: false });

  if (opts?.activeOnly !== false) {
    query = query.eq("is_active", true);
  }

  const { data } = (await query) as {
    data: Array<{
      id: string;
      player_id: string;
      reason: string;
      suspended_from: string;
      suspended_until: string | null;
      is_active: boolean;
      created_at: string | null;
      player:
        | { first_name: string; last_name: string; matric_number: string | null }
        | { first_name: string; last_name: string; matric_number: string | null }[]
        | null;
    }> | null;
  };

  return (data ?? []).map((row) => {
    const p = Array.isArray(row.player) ? row.player[0] : row.player;
    return {
      id: row.id,
      player_id: row.player_id,
      reason: row.reason,
      suspended_from: row.suspended_from,
      suspended_until: row.suspended_until,
      is_active: row.is_active,
      created_at: row.created_at,
      player_name: p ? `${p.first_name} ${p.last_name}` : "Unknown",
      matric_number: p?.matric_number ?? null,
    };
  });
}

export async function clearSuspension(
  id: string
): Promise<{ ok: true } | { error: string }> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return { error: "Suspensions require live mode" };
  }

  const supabase = await createClient();
  const { error } = await (supabase.from("player_suspensions") as ReturnType<typeof supabase.from>)
    .update({
      is_active: false,
      suspended_until: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq("id", id) as { error: { message: string } | null };

  if (error) return { error: error.message };
  return { ok: true };
}
