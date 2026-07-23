import { cookies } from "next/headers";
import { DEMO_MODE_COOKIE, isDemoMode } from "@/lib/demo-mode";

export async function getScoreDemoMode(): Promise<boolean> {
  const store = await cookies();
  return isDemoMode(store.get(DEMO_MODE_COOKIE)?.value);
}
