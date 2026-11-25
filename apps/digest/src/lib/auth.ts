import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/auth-client";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { ADMIN_MODE_COOKIE, parseAdminModeCookie } from "@/lib/admin-mode";
import type { Profile, Role } from "@/lib/types";
import { ROLE_RANK, can } from "@/lib/roles";

export { ROLE_RANK, can } from "@/lib/roles";

const PROFILE_COLUMNS =
  "id, display_name, role, avatar_url, is_super_admin, verification_level, created_at, username";

/**
 * Score-style elevation:
 * - Admin Mode off → use profiles.role (writer/editor/admin) as-is.
 * - Admin Mode on + super admin / digest ops → effective admin.
 * Never force-elevate just because is_super_admin is true.
 */
function effectiveRole(
  baseRole: Role,
  opts: { isSuperAdmin: boolean; digestAppAdmin: boolean; adminMode: boolean }
): Role {
  if (
    opts.adminMode &&
    (opts.isSuperAdmin || opts.digestAppAdmin)
  ) {
    return "admin";
  }
  return baseRole;
}

async function readAdminMode(): Promise<boolean> {
  try {
    const store = await cookies();
    return parseAdminModeCookie(store.get(ADMIN_MODE_COOKIE)?.value);
  } catch {
    return false;
  }
}

/**
 * Deduped per RSC request so admin layout + page don't each hit Auth/DB.
 */
export const getSessionProfile = cache(async (): Promise<{
  user: { id: string; email: string } | null;
  profile: Profile | null;
}> => {
  const supabase = hasSupabaseConfig()
    ? await createAuthClient()
    : await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const [{ data: profile }, { data: digestRole }, adminMode] = await Promise.all([
    supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("app_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("app", "digest")
      .maybeSingle(),
    readAdminMode(),
  ]);

  const row = (profile as Profile | null) ?? null;
  const digestAppAdmin =
    (digestRole as { role?: string } | null)?.role === "admin";
  const metaName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : "";

  if (!row) {
    const baseRole: Role = digestAppAdmin ? "admin" : "reader";
    const canElevate = digestAppAdmin;
    return {
      user: { id: user.id, email: user.email ?? "" },
      profile: {
        id: user.id,
        display_name: metaName || (user.email?.split("@")[0] ?? ""),
        role: effectiveRole(baseRole, {
          isSuperAdmin: false,
          digestAppAdmin,
          adminMode,
        }),
        base_role: baseRole,
        is_super_admin: false,
        can_elevate: canElevate,
        elevated: adminMode && canElevate,
        verification_level: "soft",
        created_at: "",
      } satisfies Profile,
    };
  }

  const baseRole = row.role;
  const isSuperAdmin = Boolean(row.is_super_admin);
  const canElevate = isSuperAdmin || digestAppAdmin;
  const elevated = adminMode && canElevate;

  return {
    user: { id: user.id, email: user.email ?? "" },
    profile: {
      ...row,
      base_role: baseRole,
      can_elevate: canElevate,
      elevated,
      role: effectiveRole(baseRole, {
        isSuperAdmin,
        digestAppAdmin,
        adminMode,
      }),
    },
  };
});

/** Redirects unless the current user holds at least `minRole`. */
export async function requireRole(minRole: Role) {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (!profile || ROLE_RANK[profile.role] < ROLE_RANK[minRole]) redirect("/");
  return { user, profile };
}

/**
 * Capability check against the *effective* role.
 * Super admin no longer bypasses unless Admin Mode elevated them.
 */
export function hasRole(profile: Profile | null, minRole: Role): boolean {
  if (!profile) return false;
  return ROLE_RANK[profile.role] >= ROLE_RANK[minRole];
}

export function profileCan(
  profile: Profile | null,
  capability: Parameters<typeof can>[1]
): boolean {
  return can(profile?.role, capability);
}

/**
 * Admin Mode is Score-style elevation for platform owners / Digest ops —
 * not the newsroom gate. Writers and editors use the newsroom at their base role.
 */
export function canUseAdminMode(profile: Profile | null): boolean {
  if (!profile) return false;
  return Boolean(profile.is_super_admin || profile.can_elevate);
}
