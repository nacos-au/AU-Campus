"use server";

import { createAuthClient } from "@/lib/supabase/auth-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile, hasRole } from "@/lib/auth";

export type DeleteMemberResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Permanently removes a member (auth user + profile cascade).
 * Admins only; cannot delete yourself or another super admin unless you are one.
 */
export async function deleteMemberAction(
  targetUserId: string
): Promise<DeleteMemberResult> {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile || !hasRole(profile, "admin")) {
    return { ok: false, error: "Only admins can remove members." };
  }
  if (!targetUserId || targetUserId === user.id) {
    return { ok: false, error: "You cannot delete your own account here." };
  }

  const auth = await createAuthClient();
  const { data: target, error: loadErr } = await auth
    .from("profiles")
    .select("id, is_super_admin, role, display_name")
    .eq("id", targetUserId)
    .maybeSingle();

  if (loadErr || !target) {
    return { ok: false, error: loadErr?.message ?? "Member not found." };
  }
  if (target.is_super_admin && !profile.is_super_admin) {
    return { ok: false, error: "Only a super admin can remove another super admin." };
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(targetUserId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        (e as Error).message ||
        "Could not delete this member. Check SUPABASE_SERVICE_ROLE_KEY is set on Vercel.",
    };
  }
}
