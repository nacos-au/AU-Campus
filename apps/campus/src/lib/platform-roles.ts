import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/urls";
import { parseOfficeModeCookie, OFFICE_MODE_COOKIE } from "@/lib/admin-mode";

export type AppId = "campus" | "digest" | "score";
export type AppRoleName = "admin" | "record_keeper";

export type CampusStaff = {
  userId: string;
  email: string | null;
  displayName: string;
  username: string | null;
  isSuperAdmin: boolean;
  isCampusAdmin: boolean;
};

export type DirectoryUser = {
  id: string;
  email: string | null;
  display_name: string;
  username: string | null;
  is_super_admin: boolean;
  verification_level: "soft" | "verified";
  role: string;
  created_at: string;
  apps: {
    campus: AppRoleName | null;
    digest: AppRoleName | null;
    score: AppRoleName | null;
  };
};

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
        .select("is_super_admin, email, display_name, username")
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
      display_name?: string | null;
      username?: string | null;
    } | null;

    const isSuperAdmin = Boolean(profileRow?.is_super_admin);
    const isCampusAdmin =
      isSuperAdmin || (appRole as { role?: string } | null)?.role === "admin";

    return {
      userId: user.id,
      email: profileRow?.email ?? user.email ?? null,
      displayName: profileRow?.display_name?.trim() || user.email?.split("@")[0] || "Admin",
      username: profileRow?.username ?? null,
      isSuperAdmin,
      isCampusAdmin,
    };
  } catch {
    return null;
  }
}

/** Super admin + Office Mode required for elevated Campus Office actions. */
export async function requireOffice(): Promise<CampusStaff> {
  const staff = await getCampusStaff();
  if (!staff) redirect("/signin?next=/office");
  if (!staff.isSuperAdmin) redirect("/?office=denied");
  const store = await cookies();
  if (!parseOfficeModeCookie(store.get(OFFICE_MODE_COOKIE)?.value)) {
    redirect("/office?mode=required");
  }
  return staff;
}

export async function requireSuperAdminSession(): Promise<CampusStaff> {
  const staff = await getCampusStaff();
  if (!staff) redirect("/signin?next=/office");
  if (!staff.isSuperAdmin) redirect("/?office=denied");
  return staff;
}
