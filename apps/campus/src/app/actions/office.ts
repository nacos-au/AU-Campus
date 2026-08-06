"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getCampusStaff,
  type AppId,
  type AppRoleName,
  type DirectoryUser,
} from "@/lib/platform-roles";
import { isOfficeModeActive } from "@/app/actions/admin-mode";

export type OfficeActionState = { ok?: boolean; error?: string } | null;

async function requireElevatedSuperAdmin() {
  const staff = await getCampusStaff();
  if (!staff?.isSuperAdmin) return { error: "Super admin only." } as const;
  if (!(await isOfficeModeActive())) {
    return { error: "Enter Office Mode first." } as const;
  }
  return { staff } as const;
}

function mapUsers(
  profiles: Array<Record<string, unknown>>,
  roles: Array<{ user_id: string; app: string; role: string }>
): DirectoryUser[] {
  const byUser = new Map<string, DirectoryUser["apps"]>();
  for (const r of roles) {
    const cur = byUser.get(r.user_id) ?? {
      campus: null,
      digest: null,
      score: null,
    };
    if (r.app === "campus" || r.app === "digest" || r.app === "score") {
      cur[r.app] = r.role as AppRoleName;
    }
    byUser.set(r.user_id, cur);
  }

  return profiles.map((p) => {
    const id = String(p.id);
    return {
      id,
      email: (p.email as string | null) ?? null,
      display_name: String(p.display_name ?? ""),
      username: (p.username as string | null) ?? null,
      is_super_admin: Boolean(p.is_super_admin),
      verification_level:
        p.verification_level === "verified" ? "verified" : "soft",
      role: String(p.role ?? "reader"),
      created_at: String(p.created_at ?? ""),
      apps: byUser.get(id) ?? { campus: null, digest: null, score: null },
    };
  });
}

export async function getOfficeStats() {
  const gate = await requireElevatedSuperAdmin();
  if ("error" in gate) return null;

  const supabase = await createClient();
  const [{ count: users }, { data: roles }, { count: soft }, { count: verified }] =
    await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("app_roles").select("app, role"),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("verification_level", "soft"),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("verification_level", "verified"),
    ]);

  const roleRows = (roles ?? []) as Array<{ app: string; role: string }>;
  const scoreAdmins = roleRows.filter((r) => r.app === "score" && r.role === "admin").length;
  const scoreKeepers = roleRows.filter(
    (r) => r.app === "score" && r.role === "record_keeper"
  ).length;
  const digestAdmins = roleRows.filter((r) => r.app === "digest").length;
  const campusAdmins = roleRows.filter((r) => r.app === "campus").length;

  return {
    users: users ?? 0,
    soft: soft ?? 0,
    verified: verified ?? 0,
    scoreAdmins,
    scoreKeepers,
    digestAdmins,
    campusAdmins,
  };
}

export async function listStaffRoster(): Promise<DirectoryUser[]> {
  const gate = await requireElevatedSuperAdmin();
  if ("error" in gate) return [];

  const supabase = await createClient();
  const { data: roles } = await supabase.from("app_roles").select("user_id, app, role");
  const roleRows = (roles ?? []) as Array<{
    user_id: string;
    app: string;
    role: string;
  }>;

  const { data: supers } = await supabase
    .from("profiles")
    .select("id, email, display_name, username, is_super_admin, verification_level, role, created_at")
    .eq("is_super_admin", true);

  const ids = new Set<string>([
    ...roleRows.map((r) => r.user_id),
    ...((supers ?? []) as Array<{ id: string }>).map((s) => s.id),
  ]);
  if (ids.size === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, display_name, username, is_super_admin, verification_level, role, created_at")
    .in("id", [...ids])
    .order("display_name", { ascending: true });

  return mapUsers((profiles ?? []) as Array<Record<string, unknown>>, roleRows);
}

export async function searchDirectory(query: string): Promise<DirectoryUser[]> {
  const gate = await requireElevatedSuperAdmin();
  if ("error" in gate) return [];

  const q = query.trim().replace(/[%(),]/g, "");
  if (q.length < 2) return [];

  const supabase = await createClient();
  const pattern = `%${q}%`;
  const cols =
    "id, email, display_name, username, is_super_admin, verification_level, role, created_at";

  const [byEmail, byName, byUser] = await Promise.all([
    supabase.from("profiles").select(cols).ilike("email", pattern).limit(20),
    supabase.from("profiles").select(cols).ilike("display_name", pattern).limit(20),
    supabase.from("profiles").select(cols).ilike("username", pattern).limit(20),
  ]);

  const merged = new Map<string, Record<string, unknown>>();
  for (const row of [
    ...((byEmail.data ?? []) as Array<Record<string, unknown>>),
    ...((byName.data ?? []) as Array<Record<string, unknown>>),
    ...((byUser.data ?? []) as Array<Record<string, unknown>>),
  ]) {
    merged.set(String(row.id), row);
  }
  const list = [...merged.values()].slice(0, 40);
  if (list.length === 0) return [];

  const { data: roles } = await supabase
    .from("app_roles")
    .select("user_id, app, role")
    .in(
      "user_id",
      list.map((p) => String(p.id))
    );

  return mapUsers(
    list,
    (roles ?? []) as Array<{ user_id: string; app: string; role: string }>
  );
}

export async function listRecentUsers(): Promise<DirectoryUser[]> {
  const gate = await requireElevatedSuperAdmin();
  if ("error" in gate) return [];

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, display_name, username, is_super_admin, verification_level, role, created_at")
    .order("created_at", { ascending: false })
    .limit(25);

  const list = (profiles ?? []) as Array<Record<string, unknown>>;
  if (list.length === 0) return [];

  const { data: roles } = await supabase
    .from("app_roles")
    .select("user_id, app, role")
    .in(
      "user_id",
      list.map((p) => String(p.id))
    );

  return mapUsers(
    list,
    (roles ?? []) as Array<{ user_id: string; app: string; role: string }>
  );
}

export async function setAppRole(input: {
  userId: string;
  app: AppId;
  role: AppRoleName | null;
}): Promise<OfficeActionState> {
  const gate = await requireElevatedSuperAdmin();
  if ("error" in gate) return { error: gate.error };

  const { userId, app, role } = input;
  if (!userId) return { error: "Missing user." };

  try {
    const supabase = await createClient();

    if (role === null) {
      const { error } = await supabase.rpc("revoke_app_role", {
        target_user_id: userId,
        p_app: app,
      });
      if (error) {
        // Fallback direct delete if RPC unavailable
        const { error: delErr } = await supabase
          .from("app_roles")
          .delete()
          .eq("user_id", userId)
          .eq("app", app);
        if (delErr) return { error: delErr.message };
      }

      if (app === "score") {
        await supabase.from("score_admins").delete().eq("user_id", userId);
      }
    } else {
      const { error } = await supabase.rpc("grant_app_role", {
        target_user_id: userId,
        p_app: app,
        p_role: role,
      });
      if (error) {
        const { error: upErr } = await supabase.from("app_roles").upsert({
          user_id: userId,
          app,
          role,
          granted_by: gate.staff.userId,
        });
        if (upErr) return { error: upErr.message };
      }

      if (app === "score" && role === "admin") {
        await supabase.from("score_admins").upsert({
          user_id: userId,
          all_sports: true,
          assigned_by: gate.staff.userId,
        });
      }
      if (app === "score" && role === "record_keeper") {
        await supabase.from("score_admins").delete().eq("user_id", userId);
      }
    }

    revalidatePath("/office");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Update failed." };
  }
}

export async function setSuperAdminFlag(input: {
  userId: string;
  enabled: boolean;
}): Promise<OfficeActionState> {
  const gate = await requireElevatedSuperAdmin();
  if ("error" in gate) return { error: gate.error };

  if (input.userId === gate.staff.userId && !input.enabled) {
    return { error: "You cannot remove your own super admin flag." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ is_super_admin: input.enabled })
      .eq("id", input.userId);
    if (error) return { error: error.message };

    revalidatePath("/office");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Update failed." };
  }
}
