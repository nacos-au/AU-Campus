import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SportNav } from "@/components/layout/sport-nav";

const LOGO_SRC = "/AU Logo.webp";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-wrapper">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-3 px-4 sm:px-6">
        <Suspense fallback={null}>
          <MobileNav />
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

        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            aria-label="Search"
            className="hidden text-accent sm:block"
          >
            <Search className="h-5 w-5" />
          </button>
          <Link
            href="/auth/login"
            className="rounded-full border-2 border-accent px-4 py-1.5 font-display text-xs font-bold text-accent sm:px-5 sm:text-sm"
          >
            Sign in
          </Link>
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
