import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/urls";

export type CampusStaff = {
  userId: string;
  email: string | null;
  isSuperAdmin: boolean;
  isCampusAdmin: boolean;
};

/**
 * Campus hub staff. Super admin or app_roles (campus, admin).
 * No UI yet — helpers for future Campus admin surfaces.
 */
export async function getCampusStaff(): Promise<CampusStaff | null> {
  if (!hasSupabaseConfig()) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const [{ data: profile }, { data: appRole }] = await Promise.all([
      supabase
        .from("profiles")
        .select("is_super_admin, email")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("app_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("app", "campus")
        .maybeSingle(),
    ]);

    const profileRow = profile as {
      is_super_admin?: boolean | null;
      email?: string | null;
    } | null;
    const isSuperAdmin = Boolean(profileRow?.is_super_admin);
    const isCampusAdmin =
      isSuperAdmin || (appRole as { role?: string } | null)?.role === "admin";

    return {
      userId: user.id,
      email: profileRow?.email ?? user.email ?? null,
      isSuperAdmin,
      isCampusAdmin,
    };
  } catch {
    return null;
  }
}
