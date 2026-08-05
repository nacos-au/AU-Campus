import "server-only";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/auth-client";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import type { Profile, Role } from "@/lib/types";
import { ROLE_RANK, can } from "@/lib/roles";

export { ROLE_RANK, can } from "@/lib/roles";

export async function getSessionProfile(): Promise<{
  user: { id: string; email: string } | null;
  profile: Profile | null;
}> {
  // Auth session must never go through the demo fixture client.
  const supabase = hasSupabaseConfig()
    ? await createAuthClient()
    : await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return {
    user: { id: user.id, email: user.email ?? "" },
    profile: (profile as Profile) ?? null,
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
  return !!profile && ROLE_RANK[profile.role] >= ROLE_RANK[minRole];
}

export function profileCan(
  profile: Profile | null,
  capability: Parameters<typeof can>[1]
): boolean {
  return can(profile?.role, capability);
}
