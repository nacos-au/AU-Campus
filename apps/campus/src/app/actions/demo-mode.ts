"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { DEMO_MODE_COOKIE, demoModeCookieOptions } from "@/lib/demo-mode";

export async function setPreferDemo(enabled: boolean) {
  const store = await cookies();
  const opts = demoModeCookieOptions(enabled);
  store.set(opts.name, opts.value, {
    path: opts.path,
    maxAge: opts.maxAge,
    sameSite: opts.sameSite,
  });
  revalidatePath("/", "layout");
}

export async function getPreferDemoCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(DEMO_MODE_COOKIE)?.value;
}
