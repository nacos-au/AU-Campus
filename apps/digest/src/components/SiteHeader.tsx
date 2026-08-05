import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile, hasRole } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";
import { site } from "@/lib/site";
import { canToggleDemoMode, isDemoMode } from "@/lib/demo-mode";
import { getDemoModeCookie } from "@/app/actions/demo-mode";
import { isAdminModeActive } from "@/app/actions/admin-mode";
import type { Section } from "@/lib/types";
import { AdminModeBanner } from "./AdminModeBanner";
import { AdminModeToggle } from "./AdminModeToggle";
import { DemoModeToggle } from "./DemoModeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { WorldClock } from "./WorldClock";
import { IconSignIn, IconSignOut, IconUser } from "./icons";

export async function SiteHeader() {
  const [t, locale, { user, profile }, supabase, demoCookie, adminMode] = await Promise.all([
    getTranslations("nav"),
    getLocale(),
    getSessionProfile(),
    createClient(),
    getDemoModeCookie(),
    isAdminModeActive(),
  ]);

  const demoActive = isDemoMode(demoCookie);
  const showDemoToggle = canToggleDemoMode();
  const isWriter = hasRole(profile, "writer");
  const canAdminMode = isWriter;
  const adminModeOn = adminMode && canAdminMode;

  const { data: sectionsData } = await supabase
    .from("sections")
    .select("*")
    .order("position");
  const sections = (sectionsData ?? []) as Section[];

  const todayLong = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const todayShort = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <header>
      {adminModeOn && <AdminModeBanner />}
      {/* ── Mobile (NYT-style): menu · masthead · account ── */}
      <div className="sticky top-0 z-40 border-b border-rule bg-paper md:hidden">
        <div className="flex items-center justify-between gap-2 px-2 py-2">
          <MobileMenu
            sections={sections}
            signedIn={!!user}
            isWriter={isWriter}
            adminMode={adminModeOn}
            signOutAction={signOut}
          />

          <Link
            href="/"
            className="flex min-w-0 flex-1 items-center justify-center gap-2"
          >
            <Image
              src="/au-logo.webp"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 object-contain"
              priority
            />
            <span className="truncate font-masthead text-[1.65rem] font-bold leading-none tracking-tight">
              {site.masthead}
            </span>
          </Link>

          <Link
            href={user ? "/account" : "/login"}
            aria-label={user ? t("account") : t("signIn")}
            className="flex h-10 w-10 items-center justify-center text-ink"
          >
            <IconUser className="h-6 w-6" />
          </Link>
        </div>

        <div className="flex items-center justify-between gap-3 px-3 pb-2.5">
          <div className="flex items-center gap-2">
            <AdminModeToggle canUse={canAdminMode} active={adminModeOn} />
            <DemoModeToggle active={demoActive} canToggle={showDemoToggle} />
          </div>
          <p className="min-w-0 truncate text-[11px] font-semibold text-ink">
            {todayShort}
          </p>
          <Link
            href="/editions"
            className="shrink-0 border border-ink px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink"
          >
            {t("subscribeShort")}
          </Link>
        </div>
      </div>

      {/* ── Desktop: keep the full editorial header ── */}
      <div className="hidden md:block">
        <div className="border-b border-rule">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 overflow-hidden px-4 py-1.5">
            <p className="whitespace-nowrap text-[11px] font-semibold text-ink">
              {todayLong}
            </p>
            <WorldClock />
          </div>
        </div>

        <div className="mx-auto grid max-w-7xl grid-cols-3 items-center gap-2 px-4 py-4">
          <div className="text-xs text-ink-soft">
            <p className="font-semibold text-ink">{site.university}</p>
            <p className="mt-0.5 max-w-52 leading-snug">{site.tagline}</p>
          </div>

          <Link
            href="/"
            className="flex items-center justify-center gap-3"
          >
            <Image
              src="/au-logo.webp"
              alt={site.university}
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 object-contain"
              priority
            />
            <span className="font-masthead text-5xl font-bold leading-none">
              {site.masthead}
            </span>
          </Link>

          <div className="flex items-center justify-end gap-4 text-xs">
            <AdminModeToggle canUse={canAdminMode} active={adminModeOn} />
            <DemoModeToggle active={demoActive} canToggle={showDemoToggle} />
            <LanguageSwitcher />
            {user ? (
              <>
                {adminModeOn && (
                  <Link
                    href="/admin"
                    className="font-semibold uppercase tracking-wider text-ink-soft hover:text-ink"
                  >
                    {t("admin")}
                  </Link>
                )}
                <Link
                  href="/account"
                  className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-ink-soft transition-colors hover:text-ink"
                >
                  <IconUser className="h-3.5 w-3.5" />
                  {t("account")}
                </Link>
                <form action={signOut}>
                  <button className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-ink-soft transition-colors hover:text-ink">
                    <IconSignOut className="h-3.5 w-3.5" />
                    {t("signOut")}
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-ink-soft transition-colors hover:text-ink"
              >
                <IconSignIn className="h-3.5 w-3.5" />
                {t("signIn")}
              </Link>
            )}
            <Link
              href="/editions"
              className="bg-accent px-3 py-1.5 font-semibold uppercase tracking-wider text-white hover:bg-accent-hover transition-colors"
            >
              {t("subscribe")}
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4">
          <div className="h-[3px] bg-ink" />
          <div className="mt-[2px] h-px bg-ink" />
        </div>

        <nav>
          <ul className="mx-auto flex max-w-7xl items-center justify-center gap-6 px-4 py-2.5 text-[13px] font-semibold">
            <li>
              <Link href="/" className="hover:text-accent whitespace-nowrap">
                {t("home")}
              </Link>
            </li>
            {sections.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/section/${s.slug}`}
                  className="hover:text-accent whitespace-nowrap"
                >
                  {s.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/editions"
                className="whitespace-nowrap text-accent hover:text-accent-hover"
              >
                {t("editions")}
              </Link>
            </li>
          </ul>
        </nav>

        <div className="mx-auto max-w-7xl px-4 pb-2">
          <div className="mx-auto h-[2px] w-24 bg-accent" />
        </div>
      </div>
    </header>
  );
}
