"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ADMIN_MODE_COOKIE, adminModeCookieOptions, parseAdminModeCookie } from "@/lib/admin-mode";
import { getSessionProfile, hasRole } from "@/lib/auth";

export async function getAdminModeCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ADMIN_MODE_COOKIE)?.value;
}

export async function isAdminModeActive(): Promise<boolean> {
  const value = await getAdminModeCookie();
  return parseAdminModeCookie(value);
}

/**
 * Enter/exit admin (newsroom) mode. Only staff with writer+ may enable it.
 */
export async function setAdminMode(enabled: boolean): Promise<{ ok: true } | { error: string }> {
  const { profile } = await getSessionProfile();
  if (!profile) {
    return { error: "Sign in first." };
  }
  if (enabled && !hasRole(profile, "writer")) {
    return { error: "Only newsroom staff can enter Admin Mode." };
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

/** Clear Admin Mode (used from newsroom exit control). */
export async function exitAdminModeAction(): Promise<void> {
  await setAdminMode(false);
  const { redirect } = await import("next/navigation");
  redirect("/");
}
