import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { isAdminModeActive } from "@/app/actions/admin-mode";
import { SiteNav } from "@/components/layout/site-nav";
import { AdminModeToggle } from "@/components/layout/admin-mode-toggle";
import { AdminModeBanner } from "@/components/layout/admin-mode-banner";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { AuthEntryButton } from "@/components/auth/auth-entry";
import { SportNav } from "@/components/layout/sport-nav";
import { PhantomIcon } from "@/components/phantom/phantom-icon";
import { PHANTOM_BRAND } from "@/lib/phantom/types";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { getSessionStaff } from "@/lib/auth/roles";
import { signOut } from "@/app/auth/actions";

const LOGO_SRC = "/AU Logo.webp";

async function getSignedInProfile(): Promise<{
  email: string;
  displayName: string;
} | null> {
  if (!hasSupabaseConfig()) return null;
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // Header is read-only for auth cookies
          },
        },
      }
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    const row = profile as { display_name?: string | null } | null;
    const metaName =
      typeof user.user_metadata?.display_name === "string"
        ? user.user_metadata.display_name
        : "";

    return {
      email: user.email,
      displayName: row?.display_name?.trim() || metaName.trim() || "",
    };
  } catch {
    return null;
  }
}

export async function SiteHeader() {
  const [staff, adminMode, signedIn] = await Promise.all([
    getSessionStaff(),
    isAdminModeActive(),
    getSignedInProfile(),
  ]);
  const canAdmin = Boolean(staff?.isAdmin && !staff.isDemoBypass);
  const showAdminRole = Boolean(staff?.isAdmin && !staff?.isDemoBypass && signedIn);

  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-wrapper">
      {adminMode && canAdmin && <AdminModeBanner />}
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-3 px-4 sm:px-6">
        <Suspense fallback={null}>
          <SiteNav adminMode={adminMode && canAdmin} signedIn={Boolean(signedIn)} />
        </Suspense>

        <Link href="/?sport=football" className="flex shrink-0 items-center lg:mr-2">
          <Image
            src={LOGO_SRC}
            alt="Achievers University"
            width={120}
            height={40}
            className="h-8 w-auto sm:h-10"
            priority
          />
        </Link>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link
            href={PHANTOM_BRAND.path}
            className="interactive-btn inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/[0.06] px-3 py-1.5 font-display text-xs font-extrabold text-accent sm:px-3.5 sm:text-sm"
            aria-label={`${PHANTOM_BRAND.name} — ${PHANTOM_BRAND.tagline}`}
            title={PHANTOM_BRAND.name}
          >
            <PhantomIcon size={16} />
            <span className="hidden sm:inline">{PHANTOM_BRAND.name}</span>
          </Link>

          <AdminModeToggle canUse={canAdmin} active={adminMode && canAdmin} />
          <button
            type="button"
            aria-label="Search"
            className="hidden h-9 w-9 items-center justify-center rounded-full text-accent transition-colors hover:bg-surface sm:inline-flex"
          >
            <Search className="h-5 w-5" />
          </button>
          {signedIn ? (
            <ProfileMenu
              email={signedIn.email}
              displayName={signedIn.displayName}
              showAdminRole={showAdminRole}
              isSuperAdmin={Boolean(staff?.isSuperAdmin)}
              signOutAction={signOut}
            />
          ) : (
            <Suspense fallback={null}>
              <AuthEntryButton />
            </Suspense>
          )}
        </div>
      </div>

      <Suspense fallback={<div className="branded-sport-nav h-[52px]" />}>
        <SportNav />
      </Suspense>
    </header>
  );
}
