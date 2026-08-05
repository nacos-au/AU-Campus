import { createClient } from "@/lib/supabase/server";
import { getScoreDemoMode } from "@/lib/data/mode";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import type { UserRole } from "@/lib/types/database";

export type StaffCapability = "admin" | "match_staff";

export interface SessionStaff {
  userId: string;
  email: string | null;
  role: UserRole;
  isAdmin: boolean;
  isRecordKeeper: boolean;
  /** Can create/edit matches and post results */
  canManageMatches: boolean;
  /** Can manage venue presets (admin only) */
  canManageVenues: boolean;
  /** True when demo mode granted local staff without a signed-in user */
  isDemoBypass: boolean;
}

const ADMIN_ROLES = new Set<string>(["platform_owner", "super_admin", "admin"]);
const KEEPER_ROLES = new Set<string>(["record_keeper", "super_admin"]);

function normalizeRole(raw: string | null | undefined): UserRole {
  if (raw === "platform_owner" || raw === "super_admin" || raw === "admin" || raw === "record_keeper") {
    return raw;
  }
  return "student";
}

/**
 * Resolve the signed-in user's staff capabilities.
 * In demo mode without Supabase, returns a local admin bypass so the UI is usable.
 * With Supabase, always enforces real roles (admin + record_keeper for match ops).
 */
export async function getSessionStaff(): Promise<SessionStaff | null> {
  const demo = await getScoreDemoMode();

  if (!hasSupabaseConfig()) {
    if (!demo) return null;
    return {
      userId: "demo-admin",
      email: "demo@local",
      role: "admin",
      isAdmin: true,
      isRecordKeeper: true,
      canManageMatches: true,
      canManageVenues: true,
      isDemoBypass: true,
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Demo viewing still needs staff tools for local iteration
      if (demo) {
        return {
          userId: "demo-admin",
          email: "demo@local",
          role: "admin",
          isAdmin: true,
          isRecordKeeper: true,
          canManageMatches: true,
          canManageVenues: true,
          isDemoBypass: true,
        };
      }
      return null;
    }

    const [{ data: profile }, { data: scoreRole }, { data: scoreAdmin }] = await Promise.all([
      supabase.from("profiles").select("role, email").eq("id", user.id).maybeSingle(),
      supabase.from("score_user_roles").select("role").eq("user_id", user.id).maybeSingle(),
      supabase.from("score_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    ]);

    const profileRow = profile as { role?: string | null; email?: string | null } | null;
    const scoreRoleRow = scoreRole as { role?: string | null } | null;
    const scoreAdminRow = scoreAdmin as { user_id?: string } | null;

    const profileRole = normalizeRole(profileRow?.role);
    const platformRole = scoreRoleRow?.role ?? null;
    const isAdmin =
      ADMIN_ROLES.has(platformRole ?? "") ||
      ADMIN_ROLES.has(profileRole) ||
      Boolean(scoreAdminRow);
    const isRecordKeeper = isAdmin || KEEPER_ROLES.has(profileRole);

    return {
      userId: user.id,
      email: profileRow?.email ?? user.email ?? null,
      role: isAdmin ? (normalizeRole(platformRole) === "student" ? "admin" : normalizeRole(platformRole)) : profileRole,
      isAdmin,
      isRecordKeeper,
      canManageMatches: isAdmin || isRecordKeeper,
      canManageVenues: isAdmin,
      isDemoBypass: false,
    };
  } catch {
    if (demo) {
      return {
        userId: "demo-admin",
        email: "demo@local",
        role: "admin",
        isAdmin: true,
        isRecordKeeper: true,
        canManageMatches: true,
        canManageVenues: true,
        isDemoBypass: true,
      };
    }
    return null;
  }
}

export async function requireMatchStaff(): Promise<
  { staff: SessionStaff } | { error: string; status: number }
> {
  const staff = await getSessionStaff();
  if (!staff) return { error: "Sign in required", status: 401 };
  if (!staff.canManageMatches) return { error: "Admin or record keeper access required", status: 403 };
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
