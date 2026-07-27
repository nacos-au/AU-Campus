"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { SPORTS } from "@/components/layout/branded-section";
import { SportIcon } from "@/components/ui/sport-icon";
import { parseSportParam } from "@/lib/utils/sport";
import { cn } from "@/lib/utils/cn";

export function SportNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSport = parseSportParam(searchParams.get("sport") ?? undefined);

  return (
    <nav className="branded-sport-nav border-b border-[#003d20]">
      <div className="hide-scrollbar mx-auto flex max-w-[1200px] gap-2 overflow-x-auto px-3 py-2 sm:gap-3 sm:px-6 sm:py-2.5">
        {SPORTS.map(({ id, label }) => {
          const isActive = activeSport === id;
          const params = new URLSearchParams(searchParams.toString());
          params.set("sport", id);
          const qs = params.toString();
          const href = qs ? `${pathname}?${qs}` : `${pathname}?sport=${id}`;

          return (
            <Link
              key={id}
              href={href}
              data-active={isActive}
              className={cn(
                "sport-nav-link flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 font-display text-[13px] font-semibold transition-all duration-200 sm:px-3 sm:py-2 sm:text-sm",
                isActive
                  ? "bg-white text-accent shadow-sm"
                  : "text-white/85 hover:bg-white/10 hover:text-white"
              )}
            >
              <SportIcon sport={id} active={isActive} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
