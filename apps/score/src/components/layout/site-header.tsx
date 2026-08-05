import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { getDemoModeCookie } from "@/app/actions/demo-mode";
import { isAdminModeActive } from "@/app/actions/admin-mode";
import { SiteNav } from "@/components/layout/site-nav";
import { DemoModeToggle } from "@/components/layout/demo-mode-toggle";
import { AdminModeToggle } from "@/components/layout/admin-mode-toggle";
import { AdminModeBanner } from "@/components/layout/admin-mode-banner";
import { SportNav } from "@/components/layout/sport-nav";
import { PhantomIcon } from "@/components/phantom/phantom-icon";
import { PHANTOM_BRAND } from "@/lib/phantom/types";
import { canToggleDemoMode, isDemoMode } from "@/lib/demo-mode";
import { getSessionStaff } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { signOut } from "@/app/auth/actions";

const LOGO_SRC = "/AU Logo.webp";

export async function SiteHeader() {
  const demoCookie = await getDemoModeCookie();
  const demoActive = isDemoMode(demoCookie);
  const showDemoToggle = canToggleDemoMode();

  const staff = await getSessionStaff();
  const adminMode = await isAdminModeActive();
  const canAdmin = Boolean(staff?.isAdmin && !staff.isDemoBypass);

  let signedInEmail: string | null = null;
  if (hasSupabaseConfig()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      signedInEmail = user?.email ?? staff?.email ?? null;
    } catch {
      signedInEmail = staff?.email ?? null;
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-wrapper">
      {adminMode && canAdmin && <AdminModeBanner />}
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-3 px-4 sm:px-6">
        <Suspense fallback={null}>
          <SiteNav adminMode={adminMode && canAdmin} />
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
          <DemoModeToggle active={demoActive} canToggle={showDemoToggle} />
          <button type="button" aria-label="Search" className="hidden text-accent sm:block">
            <Search className="h-5 w-5" />
          </button>
          <Link
            href="/demo"
            className="interactive-btn hidden rounded-full border border-rule px-4 py-1.5 font-display text-xs font-bold md:block"
          >
            Demo links
          </Link>
          {signedInEmail ? (
            <form action={signOut}>
              <button
                type="submit"
                className="interactive-btn rounded-full border-2 border-accent px-3 py-1.5 font-display text-xs font-bold sm:px-5 sm:text-sm"
                title={signedInEmail}
              >
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/auth/login"
              className="interactive-btn rounded-full border-2 border-accent px-3 py-1.5 font-display text-xs font-bold sm:px-5 sm:text-sm"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>

      <Suspense fallback={<div className="branded-sport-nav h-[52px]" />}>
        <SportNav />
      </Suspense>
    </header>
  );
}

export function LiveBadge() {
  return (
    <span className="font-display text-[11px] font-extrabold uppercase tracking-wider text-accent">
      Live
    </span>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-xl font-extrabold tracking-tight text-accent sm:text-2xl">
      {children}
    </h2>
  );
}
