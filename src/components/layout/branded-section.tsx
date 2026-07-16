"use client";

import { PageSubNav } from "@/components/layout/page-sub-nav";
import type { SportId } from "@/lib/utils/sport";

interface BrandedSectionProps {
  title: string;
  activeSport?: SportId;
  showSubNav?: boolean;
}

export function BrandedSection({
  title,
  activeSport = "football",
  showSubNav = true,
}: BrandedSectionProps) {
  return (
    <section className="branded-section">
      <div className="branded-hero relative overflow-hidden">
        <div className="branded-hero-pattern" aria-hidden />
        <div className="relative mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10">
          <h1 className="font-display text-[32px] font-bold leading-none text-white sm:text-[40px]">
            {title}
          </h1>
        </div>
      </div>

      {showSubNav && <PageSubNav activeSport={activeSport} />}
    </section>
  );
}

export const SPORTS = [
  { id: "football" as const, label: "Football" },
  { id: "basketball" as const, label: "Basketball" },
  { id: "tennis" as const, label: "Tennis" },
  { id: "volleyball" as const, label: "Volleyball" },
  { id: "track" as const, label: "Track" },
];

export type { SportId };
