"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SportId } from "@/lib/utils/sport";
import { getSportConfig } from "@/lib/utils/sport-config";
import { cn } from "@/lib/utils/cn";

function isSubNavActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/stats") return pathname.startsWith("/stats");
  if (href === "/competition") return pathname.startsWith("/competition");
  return pathname.startsWith(href);
}

export function PageSubNav({ activeSport }: { activeSport: SportId }) {
  const pathname = usePathname();
  const config = getSportConfig(activeSport);

  const subNavItems = [
    { href: "/competition", label: "Competition" },
    { href: "/", label: "Matches" },
    { href: "/standings", label: "Table" },
    { href: "/stats", label: "Statistics" },
    { href: "/teams", label: config.clubsLabel },
  ];

  return (
    <nav className="border-b border-rule bg-wrapper">
      <div className="mx-auto flex max-w-[1200px] gap-6 overflow-x-auto px-4 sm:gap-8 sm:px-6">
        {subNavItems.map(({ href, label }) => {
          const isActive = isSubNavActive(href, pathname);
          return (
            <Link
              key={href}
              href={`${href}?sport=${activeSport}`}
              className={cn(
                "relative shrink-0 py-3.5 font-display text-[15px] font-semibold text-accent/70 transition hover:text-accent",
                isActive && "text-accent"
              )}
            >
              {label}
              {isActive && (
                <span className="absolute bottom-0 left-0 h-[3px] w-full bg-accent" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
