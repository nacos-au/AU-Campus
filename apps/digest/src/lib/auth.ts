import "server-only";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/auth-client";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import type { Profile, Role } from "@/lib/types";
import { ROLE_RANK, can } from "@/lib/roles";

export { ROLE_RANK, can } from "@/lib/roles";

/**
 * Effective Digest newsroom role.
 * Super admin + digest app_roles.admin elevate to admin without changing Score.
 */
function effectiveRole(
  row: Profile | null,
  digestAppAdmin: boolean
): Role {
  if (!row) return "reader";
  if (row.is_super_admin || digestAppAdmin) return "admin";
  return row.role;
}

export async function getSessionProfile(): Promise<{
  user: { id: string; email: string } | null;
  profile: Profile | null;
}> {
  const supabase = hasSupabaseConfig()
    ? await createAuthClient()
    : await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const [{ data: profile }, { data: digestRole }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("app_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("app", "digest")
      .maybeSingle(),
  ]);

  const row = (profile as Profile | null) ?? null;
  const digestAppAdmin = (digestRole as { role?: string } | null)?.role === "admin";
  const metaName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : "";

  if (!row) {
    return {
      user: { id: user.id, email: user.email ?? "" },
      profile: {
        id: user.id,
        display_name: metaName || (user.email?.split("@")[0] ?? ""),
        role: digestAppAdmin ? "admin" : "reader",
        is_super_admin: false,
        verification_level: "soft",
        created_at: "",
      } satisfies Profile,
    };
  }

  return {
    user: { id: user.id, email: user.email ?? "" },
    profile: {
      ...row,
      role: effectiveRole(row, digestAppAdmin),
    },
  };
}

/** Redirects unless the current user holds at least `minRole`. */
export async function requireRole(minRole: Role) {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (!profile || ROLE_RANK[profile.role] < ROLE_RANK[minRole]) redirect("/");
  return { user, profile };
}

export function hasRole(profile: Profile | null, minRole: Role): boolean {
  if (!profile) return false;
  if (profile.is_super_admin) return true;
  return ROLE_RANK[profile.role] >= ROLE_RANK[minRole];
}

export function profileCan(
  profile: Profile | null,
  capability: Parameters<typeof can>[1]
): boolean {
  if (profile?.is_super_admin) return true;
  return can(profile?.role, capability);
}
