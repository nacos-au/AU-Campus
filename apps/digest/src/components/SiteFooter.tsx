import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { digestFeatures, isPublicSectionSlug } from "@/lib/features";
import { site } from "@/lib/site";
import type { Section } from "@/lib/types";
import {
  IconFacebook,
  IconInstagram,
  IconTikTok,
  IconX,
  IconYouTube,
} from "./icons";

const SOCIALS = [
  { label: "X", href: "#", Icon: IconX },
  { label: "Instagram", href: "#", Icon: IconInstagram },
  { label: "Facebook", href: "#", Icon: IconFacebook },
  { label: "YouTube", href: "#", Icon: IconYouTube },
  { label: "TikTok", href: "#", Icon: IconTikTok },
] as const;

const CAMPUS_URL = (process.env.NEXT_PUBLIC_CAMPUS_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
);
const DIGEST_URL = (process.env.NEXT_PUBLIC_DIGEST_URL ?? "http://localhost:3001").replace(
  /\/$/,
  ""
);
const CAMPUS_SIGNUP = `${CAMPUS_URL}/signup?next=${encodeURIComponent(`${DIGEST_URL}/`)}`;

function Column({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-ink">
        {heading}
      </h3>
      <ul className="mt-3 space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="text-[13px] text-ink-soft transition-colors hover:text-ink"
      >
        {children}
      </Link>
    </li>
  );
}

function PartnershipMark({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span
      className="font-masthead text-xl font-bold text-ink-soft sm:text-2xl"
      aria-hidden
    >
      {children}
    </span>
  );
}

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const supabase = await createClient();
  const { data } = await supabase.from("sections").select("*").order("position");
  const sections = ((data ?? []) as Section[]).filter((s) =>
    isPublicSectionSlug(s.slug)
  );

  return (
    <footer className="mt-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="h-px bg-ink" />
        <div className="mt-[2px] h-[3px] bg-ink" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="font-masthead text-3xl font-bold">{site.masthead}</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
              {site.address}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              {t("tagline", { university: site.university })}
            </p>
          </div>

          <ul className="flex shrink-0 items-center gap-5" aria-label={t("follow")}>
            {SOCIALS.map(({ label, href, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  aria-label={label}
                  title={label}
                  className="block text-ink-soft transition-colors hover:text-ink"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <nav className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 border-t border-rule pt-8 sm:grid-cols-3">
          <Column heading={t("sections")}>
            {sections.map((s) => (
              <FooterLink key={s.id} href={`/section/${s.slug}`}>
                {s.name}
              </FooterLink>
            ))}
          </Column>

          <Column heading={t("newsroom")}>
            {digestFeatures.talent && (
              <FooterLink href="/talent">{t("talent")}</FooterLink>
            )}
            {digestFeatures.forum && (
              <FooterLink href="/forum">{t("forum")}</FooterLink>
            )}
            <FooterLink href="#">{t("about")}</FooterLink>
            <FooterLink href="#">{t("editorialBoard")}</FooterLink>
            <FooterLink href="#">{t("join")}</FooterLink>
            <FooterLink href="#">{t("ethics")}</FooterLink>
            {digestFeatures.manualAds && (
              <FooterLink href="/advertise">{t("advertise")}</FooterLink>
            )}
            <FooterLink href="#">{t("contact")}</FooterLink>
          </Column>

          <Column heading={t("account")}>
            {digestFeatures.weekly && (
              <FooterLink href="/weekly">{t("weeklyIssue")}</FooterLink>
            )}
            <FooterLink href="/login">{t("signIn")}</FooterLink>
            <FooterLink href={CAMPUS_SIGNUP}>{t("createAccount")}</FooterLink>
            <FooterLink href="/account">{t("yourLibrary")}</FooterLink>
          </Column>
        </nav>
      </div>

      {/* Partnership */}
      <div className="border-t border-rule bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:py-12">
          <p className="text-center font-display text-sm font-semibold text-ink-soft sm:text-base">
            {t("partnershipLine")}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-7">
            <Image
              src="/AUSA.png"
              alt="Achievers University Students' Association"
              width={160}
              height={160}
              className="h-14 w-auto object-contain sm:h-16"
            />
            <PartnershipMark>×</PartnershipMark>
            <Image
              src="/nacos-au.png"
              alt="NACOS AU"
              width={160}
              height={160}
              className="h-10 w-auto object-contain sm:h-12"
            />
            <PartnershipMark>×</PartnershipMark>
            <Image
              src="/ausa-press.png"
              alt="AUSA Press"
              width={320}
              height={128}
              className="h-20 w-auto object-contain sm:h-24"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-ink-soft">
          <p>
            © {new Date().getFullYear()} {site.name}, {site.university}.{" "}
            {t("rights")} Campus weather via{" "}
            <a
              href="https://open-meteo.com/"
              className="underline-offset-2 hover:text-ink hover:underline"
              rel="noopener noreferrer"
              target="_blank"
            >
              Open-Meteo
            </a>
            .
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <a href="/privacy" className="hover:text-ink">
              {t("privacy")}
            </a>
            <a href="#" className="hover:text-ink">
              {t("terms")}
            </a>
            <a href="#" className="hover:text-ink">
              {t("sitemap")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
