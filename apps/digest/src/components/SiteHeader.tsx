import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { canUseAdminMode, getSessionProfile, hasRole } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";
import { digestFeatures, isPublicSectionSlug } from "@/lib/features";
import { site } from "@/lib/site";
import { exitAdminModeAction } from "@/app/actions/admin-mode";
import type { Section } from "@/lib/types";
import { AdminModeBanner } from "./AdminModeBanner";
import { AdminModeToggle } from "./AdminModeToggle";
import { LanguageLinks } from "./LanguageLinks";
import { NavSearch } from "./NavSearch";
import { CategoryNav, type NavItem } from "./CategoryNav";
import { MobileMenu } from "./MobileMenu";
import { ProfileMenu } from "./ProfileMenu";
import { IconUser } from "./icons";

export async function SiteHeader() {
  const [t, locale, { user, profile }, supabase] = await Promise.all([
    getTranslations("nav"),
    getLocale(),
    getSessionProfile(),
    createClient(),
  ]);

  const isWriter = hasRole(profile, "writer");
  const canElevate = canUseAdminMode(profile);
  const elevated = Boolean(profile?.elevated);
  const showAdminRole = hasRole(profile, "admin");

  const { data: sectionsData } = await supabase
    .from("sections")
    .select("*")
    .order("position");
  const sections = ((sectionsData ?? []) as Section[]).filter((s) =>
    isPublicSectionSlug(s.slug)
  );

  const todayLong = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const navItems: NavItem[] = [
    { href: "/", label: t("home") },
    ...sections.map((s) => ({ href: `/section/${s.slug}`, label: s.name })),
    ...(digestFeatures.talent
      ? [{ href: "/talent", label: t("talent") }]
      : []),
    ...(digestFeatures.forum ? [{ href: "/forum", label: t("forum") }] : []),
    ...(digestFeatures.weekly
      ? [{ href: "/weekly", label: t("weeklyIssue"), accent: true }]
      : digestFeatures.printEditions
        ? [{ href: "/editions", label: t("editions"), accent: true }]
        : []),
  ];

  return (
    <header>
      {elevated && <AdminModeBanner />}

      {/* ── Mobile ── */}
      <div className="sticky top-0 z-40 bg-paper md:hidden">
        <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center px-2 pt-2">
          <MobileMenu
            sections={sections}
            signedIn={!!user}
            isWriter={isWriter}
            adminMode={elevated}
            signOutAction={signOut}
          />

          <Link href="/" className="flex min-w-0 items-center justify-center">
            <span className="truncate font-masthead text-[1.55rem] font-bold leading-none tracking-tight">
              {site.masthead}
            </span>
          </Link>

          {user ? (
            <ProfileMenu
              compact
              email={user.email}
              displayName={profile?.display_name ?? ""}
              showAdminRole={showAdminRole}
              signOutAction={signOut}
              newsroom={isWriter}
              adminMode={elevated}
              exitAdminAction={elevated ? exitAdminModeAction : undefined}
            />
          ) : (
            <Link
              href="/login"
              aria-label={t("signIn")}
              className="flex h-10 w-10 items-center justify-center text-ink"
            >
              <IconUser className="h-6 w-6" />
            </Link>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-1">
          <p className="min-w-0 truncate text-xs font-semibold text-ink">{todayLong}</p>
          {digestFeatures.weekly && (
            <Link
              href="/weekly"
              className="shrink-0 border border-ink px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-ink"
            >
              {t("weeklyIssue")}
            </Link>
          )}
        </div>
      </div>

      {/* ── Desktop ── */}
      <div className="hidden md:block">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-start gap-6 px-4 pb-3 pt-2.5">
          <div className="flex flex-col items-start gap-1.5">
            <NavSearch />
            <p className="text-[11px] font-semibold text-ink">{todayLong}</p>
            {digestFeatures.weekly && (
              <Link
                href="/weekly"
                className="text-[11px] font-bold uppercase tracking-wider text-accent hover:text-accent-hover"
              >
                {t("weeklyIssue")}
              </Link>
            )}
          </div>

          <div className="flex flex-col items-center gap-2.5 pt-1">
            <LanguageLinks />
            <Link href="/" className="flex items-center justify-center">
              <span className="font-masthead text-5xl font-bold leading-none">
                {site.masthead}
              </span>
            </Link>
          </div>

          <div className="flex items-center justify-end gap-2 pt-0.5">
            <AdminModeToggle canUse={canElevate} active={elevated} />
            {isWriter && (
              <Link
                href="/admin"
                className="text-[11px] font-bold uppercase tracking-wider text-ink-soft hover:text-ink"
              >
                {t("admin")}
              </Link>
            )}
            {digestFeatures.weekly && (
              <Link
                href="/weekly"
                className="bg-accent px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-accent-hover transition-colors"
              >
                {t("weeklyIssue")}
              </Link>
            )}
            {user ? (
              <ProfileMenu
                compact
                email={user.email}
                displayName={profile?.display_name ?? ""}
                showAdminRole={showAdminRole}
                signOutAction={signOut}
              />
            ) : (
              <Link
                href="/login"
                aria-label={t("signIn")}
                title={t("signIn")}
                className="flex h-10 w-10 items-center justify-center text-ink hover:text-accent"
              >
                <IconUser className="h-6 w-6" />
              </Link>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4">
          <div className="h-[3px] bg-ink" />
          <div className="mt-[2px] h-px bg-ink" />
        </div>

        <CategoryNav items={navItems} />
      </div>
    </header>
  );
}
