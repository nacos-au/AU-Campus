import { createClient } from "@/lib/supabase/server";
import { getScoreDemoMode } from "@/lib/data/mode";
import { hasSupabaseConfig, isProductionRuntime } from "@/lib/demo-mode";
import type { UserRole } from "@/lib/types/database";

export type StaffCapability = "admin" | "match_staff";

export interface SessionStaff {
  userId: string;
  email: string | null;
  role: UserRole;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isRecordKeeper: boolean;
  /** Nested /admin desk (ops tools for keepers; full desk for admins) */
  canAccessAdminDesk: boolean;
  /** Can create/edit matches, reconcile results, season awards */
  canManageMatches: boolean;
  /** Can manage venue presets (admin only) */
  canManageVenues: boolean;
  /** Clubs / competitions structure (admin only) */
  canManageCompetitions: boolean;
  /** True when local demo fixtures granted staff without a signed-in user */
  isDemoBypass: boolean;
}

function normalizeScoreRole(raw: string | null | undefined): UserRole {
  if (
    raw === "platform_owner" ||
    raw === "super_admin" ||
    raw === "admin" ||
    raw === "record_keeper"
  ) {
    return raw;
  }
  return "student";
}

function demoStaff(): SessionStaff {
  return {
    userId: "demo-admin",
    email: "demo@local",
    role: "admin",
    isSuperAdmin: true,
    isAdmin: true,
    isRecordKeeper: true,
    canAccessAdminDesk: true,
    canManageMatches: true,
    canManageVenues: true,
    canManageCompetitions: true,
    isDemoBypass: true,
  };
}

/**
 * Resolve Score staff capabilities for the signed-in user.
 *
 * Privilege sources (in order):
 * 1. profiles.is_super_admin — all platforms
 * 2. app_roles where app = 'score' (admin | record_keeper)
 * 3. Legacy score_admins / score_user_roles
 *
 * Digest `profiles.role = admin` does NOT grant Score access.
 * Demo staff bypass is local-only — never in production.
 */
export async function getSessionStaff(): Promise<SessionStaff | null> {
  const demo = await getScoreDemoMode();
  const allowDemoStaff = demo && !isProductionRuntime();

  if (!hasSupabaseConfig()) {
    return allowDemoStaff ? demoStaff() : null;
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return allowDemoStaff ? demoStaff() : null;
    }

    const [
      { data: profile },
      { data: appRole },
      { data: scoreRole },
      { data: scoreAdmin },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("is_super_admin, email")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("app_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("app", "score")
        .maybeSingle(),
      supabase.from("score_user_roles").select("role").eq("user_id", user.id).maybeSingle(),
      supabase.from("score_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    ]);

    const profileRow = profile as {
      is_super_admin?: boolean | null;
      email?: string | null;
    } | null;
    const appRoleRow = appRole as { role?: string | null } | null;
    const scoreRoleRow = scoreRole as { role?: string | null } | null;
    const scoreAdminRow = scoreAdmin as { user_id?: string } | null;

    const isSuperAdmin = Boolean(profileRow?.is_super_admin) ||
      scoreRoleRow?.role === "platform_owner" ||
      scoreRoleRow?.role === "super_admin";

    const scoreAppRole = appRoleRow?.role ?? null;
    const legacyScoreRole = scoreRoleRow?.role ?? null;

    const isAdmin =
      isSuperAdmin ||
      scoreAppRole === "admin" ||
      Boolean(scoreAdminRow) ||
      legacyScoreRole === "admin" ||
      legacyScoreRole === "platform_owner" ||
      legacyScoreRole === "super_admin";

    const isRecordKeeper =
      isAdmin || scoreAppRole === "record_keeper";

    const role: UserRole = isSuperAdmin
      ? "super_admin"
      : isAdmin
        ? "admin"
        : scoreAppRole === "record_keeper"
          ? "record_keeper"
          : normalizeScoreRole(legacyScoreRole);

    const canManageMatches = isAdmin || isRecordKeeper;

    return {
      userId: user.id,
      email: profileRow?.email ?? user.email ?? null,
      role,
      isSuperAdmin,
      isAdmin,
      isRecordKeeper,
      canAccessAdminDesk: canManageMatches,
      canManageMatches,
      canManageVenues: isAdmin,
      canManageCompetitions: isAdmin,
      isDemoBypass: false,
    };
  } catch {
    return allowDemoStaff ? demoStaff() : null;
  }
}

export async function requireMatchStaff(): Promise<
  { staff: SessionStaff } | { error: string; status: number }
> {
  const staff = await getSessionStaff();
  if (!staff) return { error: "Sign in required", status: 401 };
  if (!staff.canManageMatches) {
    return { error: "Admin or record keeper access required", status: 403 };
  }
  return { staff };
}

export async function requireAdmin(): Promise<
  { staff: SessionStaff } | { error: string; status: number }
> {
  const staff = await getSessionStaff();
  if (!staff) return { error: "Sign in required", status: 401 };
  if (!staff.canManageVenues) return { error: "Admin access required", status: 403 };

  if (!staff.isDemoBypass) {
    const { isAdminModeActive } = await import("@/app/actions/admin-mode");
    if (!(await isAdminModeActive())) {
      return {
        error: "Turn on Admin Mode in the header before performing admin actions.",
        status: 403,
      };
    }
  }

  return { staff };
}

/** Auth required — no anonymous mutating clients. */
export async function requireSignedIn(): Promise<
  { userId: string } | { error: string; status: number }
> {
  if (!hasSupabaseConfig()) {
    if (!isProductionRuntime()) return { userId: "demo-user" };
    return { error: "Sign in required", status: 401 };
  }
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Sign in required", status: 401 };
    return { userId: user.id };
  } catch {
    return { error: "Sign in required", status: 401 };
  }
}
