"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ADMIN_MODE_COOKIE, adminModeCookieOptions, parseAdminModeCookie } from "@/lib/admin-mode";
import { canUseAdminMode, getSessionProfile } from "@/lib/auth";

export async function getAdminModeCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ADMIN_MODE_COOKIE)?.value;
}

export async function isAdminModeActive(): Promise<boolean> {
  const value = await getAdminModeCookie();
  return parseAdminModeCookie(value);
}

/**
 * Enter/exit Admin Mode (Score-style elevation).
 * Super admin / Digest ops → effective admin while on.
 * Writers and editors do not need this for the newsroom.
 */
export async function setAdminMode(enabled: boolean): Promise<{ ok: true } | { error: string }> {
  const { profile } = await getSessionProfile();
  if (!profile) {
    return { error: "Sign in first." };
  }
  if (enabled && !canUseAdminMode(profile)) {
    return { error: "Only the super admin can enter Admin Mode." };
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

/** Leave the newsroom UI without clearing Admin Mode elevation. */
export async function leaveNewsroomAction(): Promise<void> {
  const { redirect } = await import("next/navigation");
  redirect("/");
}

/** Clear elevation and return to the paper. */
export async function exitAdminModeAction(): Promise<void> {
  await setAdminMode(false);
  const { redirect } = await import("next/navigation");
  redirect("/");
}
