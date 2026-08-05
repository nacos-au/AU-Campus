"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ADMIN_MODE_COOKIE, adminModeCookieOptions, parseAdminModeCookie } from "@/lib/admin-mode";
import { getSessionStaff } from "@/lib/auth/roles";

export async function getAdminModeCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ADMIN_MODE_COOKIE)?.value;
}

export async function isAdminModeActive(): Promise<boolean> {
  const value = await getAdminModeCookie();
  return parseAdminModeCookie(value);
}

/**
 * Enter/exit admin mode. Only campus admins may enable it.
 * Callers should confirm with the user before enabling.
 */
export async function setAdminMode(enabled: boolean): Promise<{ ok: true } | { error: string }> {
  const staff = await getSessionStaff();
  if (!staff || staff.isDemoBypass) {
    return { error: "Sign in with your campus admin account first." };
  }
  if (enabled && !staff.isAdmin) {
    return { error: "Only admins can enter Admin Mode." };
  }

  const store = await cookies();
  const opts = adminModeCookieOptions(enabled);
  store.set(opts.name, opts.value, {
    path: opts.path,
    maxAge: opts.maxAge,
    sameSite: opts.sameSite,
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Staff role alone is not enough for elevated writes — Admin Mode must be on. */
export async function requireAdminMode(): Promise<
  { ok: true } | { error: string; status: number }
> {
  const staff = await getSessionStaff();
  if (!staff || staff.isDemoBypass) {
    return { error: "Sign in required", status: 401 };
  }
  if (!staff.isAdmin) {
    return { error: "Admin access required", status: 403 };
  }
  if (!(await isAdminModeActive())) {
    return {
      error: "Turn on Admin Mode in the header before performing admin actions.",
      status: 403,
    };
  }
  return { ok: true };
}
