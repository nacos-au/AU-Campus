"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { SPORTS } from "@/components/layout/branded-section";
import { parseSportParam } from "@/lib/utils/sport";
import { cn } from "@/lib/utils/cn";

export function SportNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSport = parseSportParam(searchParams.get("sport") ?? undefined);

  return (
    <nav className="branded-sport-nav border-b border-[#003d20]">
      <div className="mx-auto flex max-w-[1200px] gap-5 overflow-x-auto px-4 sm:gap-8 sm:px-6">
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
              className={cn(
                "relative shrink-0 py-3.5 font-display text-[15px] font-semibold text-white/80 transition hover:text-white",
                isActive && "text-white"
              )}
            >
              {label}
              {isActive && (
                <span className="absolute bottom-0 left-0 h-[3px] w-full bg-white" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
