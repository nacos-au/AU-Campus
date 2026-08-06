"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  OFFICE_MODE_COOKIE,
  officeModeCookieOptions,
  parseOfficeModeCookie,
} from "@/lib/admin-mode";
import { getCampusStaff } from "@/lib/platform-roles";

export async function isOfficeModeActive(): Promise<boolean> {
  const store = await cookies();
  return parseOfficeModeCookie(store.get(OFFICE_MODE_COOKIE)?.value);
}

export async function setOfficeMode(
  enabled: boolean
): Promise<{ ok: true } | { error: string }> {
  const staff = await getCampusStaff();
  if (!staff) return { error: "Sign in first." };
  if (enabled && !staff.isSuperAdmin) {
    return { error: "Only the super admin can enter Campus Office." };
  }

  const store = await cookies();
  const opts = officeModeCookieOptions(enabled);
  store.set(opts.name, opts.value, {
    path: opts.path,
    maxAge: enabled ? opts.maxAge : 0,
    sameSite: opts.sameSite,
  });

  revalidatePath("/", "layout");
  revalidatePath("/office");
  return { ok: true };
}
