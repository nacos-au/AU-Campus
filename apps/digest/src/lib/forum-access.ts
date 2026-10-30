import "server-only";
import { getSessionProfile, hasRole } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo-mode";
import { getDemoModeCookie } from "@/app/actions/demo-mode";
import type { Profile } from "@/lib/types";

export async function loadForumAccess(): Promise<{
  demo: boolean;
  signedIn: boolean;
  allowed: boolean;
  canStartThread: boolean;
  profile: Profile | null;
}> {
  const demo = isDemoMode(await getDemoModeCookie());
  if (demo) {
    return {
      demo: true,
      signedIn: false,
      allowed: true,
      canStartThread: false,
      profile: null,
    };
  }

  const { user, profile } = await getSessionProfile();
  const editor = hasRole(profile, "editor");
  const verified = profile?.verification_level === "verified";
  const allowed = Boolean(user) && (verified || editor);
  const karma = profile?.forum_karma ?? 0;
  return {
    demo: false,
    signedIn: Boolean(user),
    allowed,
    canStartThread: editor || (verified && karma >= 10),
    profile,
  };
}
