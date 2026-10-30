import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile, hasRole } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";
import { site } from "@/lib/site";
import { isAdminModeActive } from "@/app/actions/admin-mode";
import type { Section } from "@/lib/types";
import { AdminModeBanner } from "./AdminModeBanner";
import { AdminModeToggle } from "./AdminModeToggle";
import { LanguageLinks } from "./LanguageLinks";
import { MobileMenu } from "./MobileMenu";
import { ProfileMenu } from "./ProfileMenu";
import { IconSearch, IconUser } from "./icons";

export async function SiteHeader() {
  const [t, locale, { user, profile }, supabase, adminMode] = await Promise.all([
    getTranslations("nav"),
    getLocale(),
    getSessionProfile(),
    createClient(),
    isAdminModeActive(),
  ]);

  const isWriter = hasRole(profile, "writer");
  const canAdminMode = isWriter;
  const adminModeOn = adminMode && canAdminMode;
  const showAdminRole = hasRole(profile, "admin");

  const { data: sectionsData } = await supabase
    .from("sections")
    .select("*")
    .order("position");
  const sections = (sectionsData ?? []) as Section[];

  const todayLong = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <header>
      {adminModeOn && <AdminModeBanner />}

      {/* ── Mobile: menu · masthead · account, then date + CTA (no card border) ── */}
      <div className="sticky top-0 z-40 bg-paper md:hidden">
        <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center px-2 pt-2">
          <MobileMenu
            sections={sections}
            signedIn={!!user}
            isWriter={isWriter}
            adminMode={adminModeOn}
            signOutAction={signOut}
          />

          <Link href="/" className="flex min-w-0 items-center justify-center gap-2">
            <Image
              src="/au-logo.webp"
              alt=""
              width={26}
              height={26}
              className="h-[26px] w-[26px] shrink-0 object-contain"
              priority
            />
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
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-xs font-semibold text-ink">{todayLong}</p>
            <AdminModeToggle canUse={canAdminMode} active={adminModeOn} />
          </div>
          <Link
            href="/editions"
            className="shrink-0 border border-ink px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-ink"
          >
            {t("buySeasonal")}
          </Link>
        </div>
      </div>

      {/* ── Desktop: NYT-style masthead ── */}
      <div className="hidden md:block">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-start gap-6 px-4 pb-4 pt-5">
          {/* left */}
          <div className="flex flex-col items-start gap-3 pt-1">
            <form action="/search" role="search" className="flex items-center gap-2">
              <button
                type="submit"
                aria-label={t("search")}
                className="text-ink hover:text-accent"
              >
                <IconSearch className="h-5 w-5" />
              </button>
              <input
                name="q"
                type="search"
                placeholder={t("search")}
                className="w-28 border-b border-transparent bg-transparent text-xs placeholder:text-ink-soft focus:border-ink focus:outline-none focus:w-44 transition-[width]"
              />
            </form>
            <p className="text-xs font-semibold text-ink">{todayLong}</p>
            <Link
              href="/editions"
              className="text-xs font-bold uppercase tracking-wider text-accent hover:text-accent-hover"
            >
              {t("weeklyIssue")}
            </Link>
          </div>

          {/* center */}
          <div className="flex flex-col items-center gap-3">
            <LanguageLinks />
            <Link href="/" className="flex items-center justify-center gap-3">
              <Image
                src="/au-logo.webp"
                alt={site.university}
                width={44}
                height={44}
                className="h-11 w-11 shrink-0 object-contain"
                priority
              />
              <span className="font-masthead text-5xl font-bold leading-none">
                {site.masthead}
              </span>
            </Link>
          </div>

          {/* right */}
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-3">
              <AdminModeToggle canUse={canAdminMode} active={adminModeOn} />
              {adminModeOn && (
                <Link
                  href="/admin"
                  className="text-[11px] font-bold uppercase tracking-wider text-ink-soft hover:text-ink"
                >
                  {t("admin")}
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
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-ink text-ink hover:bg-ink hover:text-paper transition-colors"
                >
                  <IconUser className="h-5 w-5" />
                </Link>
              )}
            </div>
            <Link
              href="/editions"
              className="bg-accent px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-accent-hover transition-colors"
            >
              {t("buySeasonal")}
            </Link>
            {!user && (
              <Link
                href="/login"
                className="border border-ink px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider hover:bg-ink hover:text-paper transition-colors"
              >
                {t("signIn")}
              </Link>
            )}
          </div>
        </div>

        <nav className="border-y border-rule-dark">
          <ul className="mx-auto flex max-w-7xl items-center justify-center gap-x-7 overflow-x-auto px-4 py-2.5 text-[13px] font-semibold [scrollbar-width:none]">
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
              <Link href="/talent" className="hover:text-accent whitespace-nowrap">
                {t("talent")}
              </Link>
            </li>
            <li>
              <Link href="/forum" className="hover:text-accent whitespace-nowrap">
                {t("forum")}
              </Link>
            </li>
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
      </div>
    </header>
  );
}
