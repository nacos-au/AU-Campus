import Image from "next/image";
import Link from "next/link";
import { getDemoModeCookie } from "@/app/actions/demo-mode";
import { DemoModeToggle } from "@/components/layout/demo-mode-toggle";
import { PhantomIcon } from "@/components/phantom/phantom-icon";
import { PHANTOM_BRAND } from "@/lib/phantom/types";
import { canToggleDemoMode, isDemoMode } from "@/lib/demo-mode";
import { SPORT_IDS, SPORT_LABELS } from "@/lib/utils/sport";

const LOGO_SRC = "/AU Logo.webp";

const CAMPUS_URL = (process.env.NEXT_PUBLIC_CAMPUS_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
);
const DIGEST_URL = (process.env.NEXT_PUBLIC_DIGEST_URL ?? "http://localhost:3001").replace(
  /\/$/,
  ""
);

const EXPLORE = [
  { href: "/", label: "Matches" },
  { href: "/standings", label: "Table" },
  { href: "/competition", label: "Competition" },
  { href: "/stats", label: "Statistics" },
  { href: "/teams", label: "Clubs" },
] as const;

function Column({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-[11px] font-bold uppercase tracking-wide text-accent/55">
        {heading}
      </h3>
      <ul className="mt-3 space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
  external = false,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  const className =
    "inline-flex items-center gap-1.5 font-display text-[13px] font-semibold text-accent/80 transition-colors hover:text-accent";
  return (
    <li>
      {external ? (
        <a href={href} className={className}>
          {children}
        </a>
      ) : (
        <Link href={href} className={className}>
          {children}
        </Link>
      )}
    </li>
  );
}

/**
 * Site footer — mirrors the Digest footer pattern: quiet link columns, a
 * signature brand rule, and the staging demo controls tucked at the very bottom.
 */
export async function SiteFooter() {
  const demoCookie = await getDemoModeCookie();
  const demoActive = isDemoMode(demoCookie);
  const showDemoToggle = canToggleDemoMode();

  return (
    <footer className="bg-white">
      {/* Signature rule — echo of the green sport nav */}
      <div className="branded-hero h-1" aria-hidden />

      <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link href="/?sport=football" className="inline-flex items-center gap-3">
              <Image
                src={LOGO_SRC}
                alt="Achievers University"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
              />
              <span className="font-display text-2xl font-extrabold tracking-tight text-accent">
                AU Score
              </span>
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-accent/70">
              Live scores, tables and player statistics for Achievers University campus sport.
            </p>
          </div>

          <Link
            href={PHANTOM_BRAND.path}
            className="interactive-btn inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-accent/25 bg-white px-4 py-2 font-display text-sm font-extrabold"
            title={PHANTOM_BRAND.tagline}
          >
            <PhantomIcon size={16} />
            {PHANTOM_BRAND.name}
            <span className="hidden font-sans text-xs font-medium text-accent/60 sm:inline">
              · {PHANTOM_BRAND.tagline}
            </span>
          </Link>
        </div>

        <nav className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-rule pt-8 sm:grid-cols-4">
          <Column heading="Sports">
            {SPORT_IDS.map((id) => (
              <FooterLink key={id} href={`/?sport=${id}`}>
                {SPORT_LABELS[id]}
              </FooterLink>
            ))}
          </Column>

          <Column heading="Explore">
            {EXPLORE.map(({ href, label }) => (
              <FooterLink key={href} href={`${href}?sport=football`}>
                {label}
              </FooterLink>
            ))}
          </Column>

          <Column heading="Tools">
            <FooterLink href={PHANTOM_BRAND.path}>{PHANTOM_BRAND.name}</FooterLink>
            <FooterLink href="/keeper?sport=football">Record Keeper</FooterLink>
            <FooterLink href="/?auth=signin">Sign in</FooterLink>
            <FooterLink href="/account/settings">Account settings</FooterLink>
          </Column>

          <Column heading="AU Campus">
            <FooterLink href={CAMPUS_URL} external>
              AU Campus
            </FooterLink>
            <FooterLink href={DIGEST_URL} external>
              The AU Digest
            </FooterLink>
            <FooterLink href={`${CAMPUS_URL}/signup`} external>
              Create account
            </FooterLink>
          </Column>
        </nav>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-rule pt-4 text-xs text-accent/60">
          <p>© {new Date().getFullYear()} AU Score, Achievers University. All rights reserved.</p>
          <p className="font-display font-semibold">KM 1 Idasen/Uteh Road, Owo, Ondo</p>
        </div>

        {/* DEPLOY_DEMO_TOGGLE — remove this whole block when staging toggle is no longer needed */}
        {(showDemoToggle || demoActive) && (
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-rule/70 pt-3 text-[11px] text-accent/60">
            <DemoModeToggle active={demoActive} canToggle={showDemoToggle} />
            <span className="hidden sm:inline" aria-hidden>
              ·
            </span>
            <Link
              href="/demo"
              className="font-display text-[11px] font-bold uppercase tracking-wide text-accent/70 underline-offset-4 hover:text-accent hover:underline"
            >
              Demo links
            </Link>
            {demoActive && (
              <span className="font-medium">Sample data · nothing here is a real result</span>
            )}
          </div>
        )}
      </div>
    </footer>
  );
}
