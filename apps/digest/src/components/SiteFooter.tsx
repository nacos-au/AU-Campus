import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
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

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const supabase = await createClient();
  const { data } = await supabase.from("sections").select("*").order("position");
  const sections = (data ?? []) as Section[];

  return (
    <footer className="mt-16">
      {/* Echo of the header's signature rule */}
      <div className="mx-auto max-w-7xl px-4">
        <div className="h-px bg-ink" />
        <div className="mt-[2px] h-[3px] bg-ink" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-4">
              <p className="font-masthead text-3xl font-bold">{site.masthead}</p>
              {/* Quiet affiliation mark — banner sits to the right of the name */}
              <Image
                src="/au-banner.png"
                alt={`${site.university} — Knowledge, Integrity & Leadership`}
                width={220}
                height={72}
                className="h-10 w-auto object-contain opacity-90 sm:h-11"
              />
            </div>
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

        <nav className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 border-t border-rule pt-8 sm:grid-cols-4">
          <Column heading={t("sections")}>
            {sections.map((s) => (
              <FooterLink key={s.id} href={`/section/${s.slug}`}>
                {s.name}
              </FooterLink>
            ))}
          </Column>

          <Column heading={t("newsroom")}>
            <FooterLink href="#">{t("about")}</FooterLink>
            <FooterLink href="#">{t("editorialBoard")}</FooterLink>
            <FooterLink href="#">{t("join")}</FooterLink>
            <FooterLink href="#">{t("ethics")}</FooterLink>
            <FooterLink href="#">{t("advertise")}</FooterLink>
            <FooterLink href="#">{t("contact")}</FooterLink>
          </Column>

          <Column heading={t("editionsHeading")}>
            <FooterLink href="/editions">{t("printEditions")}</FooterLink>
            <FooterLink href="/editions">{t("latestIssue")}</FooterLink>
            <FooterLink href="/editions">{t("buyIssue")}</FooterLink>
          </Column>

          <Column heading={t("account")}>
            <FooterLink href="/login">{t("signIn")}</FooterLink>
            <FooterLink href="/signup">{t("createAccount")}</FooterLink>
            <FooterLink href="/account">{t("yourLibrary")}</FooterLink>
          </Column>
        </nav>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-rule pt-4 text-xs text-ink-soft">
          <p>
            © {new Date().getFullYear()} {site.name}, {site.university}.{" "}
            {t("rights")}
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <a href="#" className="hover:text-ink">
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
