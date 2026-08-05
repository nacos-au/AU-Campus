"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight, LogIn, Menu, X } from "lucide-react";
import { SPORTS } from "@/components/layout/branded-section";
import { SportIcon } from "@/components/ui/sport-icon";
import { PhantomIcon } from "@/components/phantom/phantom-icon";
import { PHANTOM_BRAND } from "@/lib/phantom/types";
import { parseSportParam } from "@/lib/utils/sport";
import { cn } from "@/lib/utils/cn";

const LOGO_SRC = "/AU Logo.webp";

const baseNavItems: Array<{ href: string; label: string; featured?: boolean }> = [
  { href: "/", label: "Matches" },
  { href: "/standings", label: "Table" },
  { href: "/competition", label: "Competition" },
  { href: "/stats", label: "Statistics" },
  { href: "/teams", label: "Clubs" },
  { href: PHANTOM_BRAND.path, label: PHANTOM_BRAND.name, featured: true },
  { href: "/demo", label: "Demo Links" },
  { href: "/keeper", label: "Record Keeper" },
];

/** Hamburger drawer — available on mobile and desktop. */
export function SiteNav({
  adminMode = false,
  signedIn = false,
}: {
  adminMode?: boolean;
  signedIn?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sport = parseSportParam(searchParams.get("sport") ?? undefined);

  const subNavItems = adminMode
    ? [...baseNavItems, { href: "/admin", label: "Admin" }]
    : baseNavItems;

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function hrefWithSport(href: string) {
    if (
      href === "/admin" ||
      href === "/auth/login" ||
      href === "/demo" ||
      href === PHANTOM_BRAND.path
    ) {
      return href;
    }
    if (href === "/keeper") {
      return `/keeper?sport=${sport}`;
    }
    return `${href}?sport=${sport}`;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center text-accent"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" strokeWidth={2.5} />
      </button>

      <div
        className={cn(
          "fixed inset-0 z-[60] bg-accent/85 transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      <aside
        className={cn(
          "fixed left-0 top-0 z-[70] flex h-full w-[min(320px,85vw)] flex-col rounded-r-3xl bg-white shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!open}
      >
        <div className="flex items-start justify-between p-5">
          <Image src={LOGO_SRC} alt="Achievers University" width={100} height={36} className="h-9 w-auto" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-accent hover:bg-surface"
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 px-5 pb-4">
          {signedIn ? (
            <Link
              href="/account/settings"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-2 rounded-full border-2 border-accent px-5 py-2 font-display text-sm font-bold text-accent"
            >
              Account settings
            </Link>
          ) : (
            <Link
              href="/auth/login"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-2 rounded-full border-2 border-accent px-5 py-2 font-display text-sm font-bold text-accent"
            >
              <LogIn className="h-4 w-4" />
              Login
            </Link>
          )}
          <Link
            href={PHANTOM_BRAND.path}
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 font-display text-sm font-bold text-white"
          >
            <PhantomIcon size={16} className="text-white" />
            {PHANTOM_BRAND.name}
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-8">
          <p className="px-3 pb-2 pt-4 font-display text-xs font-bold uppercase tracking-wide text-accent/50">
            Sports
          </p>
          {SPORTS.map(({ id, label }) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("sport", id);
            const href = `${pathname}?${params.toString()}`;
            return (
              <Link
                key={id}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl px-3 py-3 font-display text-base font-bold text-accent hover:bg-surface",
                  sport === id && "bg-surface"
                )}
              >
                <span className="flex items-center gap-2.5">
                  <SportIcon sport={id} size="sm" active={sport === id} />
                  {label}
                </span>
                <ChevronRight className="h-4 w-4 text-accent/30" />
              </Link>
            );
          })}

          <p className="px-3 pb-2 pt-6 font-display text-xs font-bold uppercase tracking-wide text-accent/50">
            Sections
          </p>
          {subNavItems.map(({ href, label, featured }) => (
            <Link
              key={href}
              href={hrefWithSport(href)}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center justify-between rounded-xl px-3 py-3.5 font-display text-lg font-bold text-accent hover:bg-surface",
                featured && "bg-surface"
              )}
            >
              <span className="flex items-center gap-2">
                {featured && <PhantomIcon size={18} />}
                {label}
              </span>
              <ChevronRight className="h-5 w-5 text-accent/30" />
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
