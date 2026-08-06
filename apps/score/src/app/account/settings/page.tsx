import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { getSessionStaff } from "@/lib/auth/roles";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { ScoreProfileSettingsForm } from "./settings-form";

export const metadata = { title: "Account settings" };
export const dynamic = "force-dynamic";

async function createUntypedClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // ignore
          }
        },
      },
    }
  );
}

export default async function ScoreAccountSettingsPage() {
  if (!hasSupabaseConfig()) {
    redirect("/?auth=signin&next=/account/settings");
  }

  const supabase = await createUntypedClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?auth=signin&next=/account/settings");

  const staff = await getSessionStaff();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .maybeSingle();

  const profileRow = profile as {
    display_name?: string | null;
    username?: string | null;
  } | null;
  const displayName = profileRow?.display_name?.trim() || user.email?.split("@")[0] || "";
  const username =
    profileRow?.username?.trim() ||
    (typeof user.user_metadata?.username === "string" ? user.user_metadata.username : "") ||
    "";
  const showAdmin = Boolean(staff?.isAdmin && !staff.isDemoBypass);

  return (
    <>
      <BrandedSection title="Account" activeSport="football" />
      <PageContent>
        <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
          <p className="font-display text-xs font-bold uppercase tracking-wide opacity-50">
            <Link href="/" className="hover:underline">
              Home
            </Link>{" "}
            / Settings
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">
            Account settings
          </h1>
          <p className="mt-2 text-sm opacity-70">
            {username ? `@${username}` : displayName}
            {showAdmin && (
              <>
                {" "}
                · <span className="font-semibold uppercase tracking-wide">Admin</span>
              </>
            )}
          </p>

          <ScoreProfileSettingsForm
            displayName={displayName}
            username={username}
            email={user.email ?? ""}
          />
        </div>
      </PageContent>
    </>
  );
}
