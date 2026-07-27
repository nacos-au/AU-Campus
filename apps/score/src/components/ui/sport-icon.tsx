import type { ComponentType } from "react";
import type { SportId } from "@/lib/utils/sport";
import { cn } from "@/lib/utils/cn";

interface SportIconProps {
  sport: SportId;
  className?: string;
  active?: boolean;
}

function IconFootball({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 5.5 14.2 8.8 12 12.2 9.8 8.8 12 5.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M12 5.5V3M14.2 8.8l2-1.2M9.8 8.8l-2-1.2M12 12.2V15M9.8 8.8 7.5 11M14.2 8.8l2.5 2.2M12 12.2l-2.5 2.2M12 12.2l2.5 2.2"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconBasketball({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.5 12h17M12 3.5c2.8 2.6 4.5 6 4.5 8.5S14.8 17.9 12 20.5M12 3.5C9.2 6.1 7.5 9.5 7.5 12s1.7 5.9 4.5 8.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconTennis({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <ellipse cx="10" cy="14" rx="5.5" ry="7" stroke="currentColor" strokeWidth="1.4" transform="rotate(-35 10 14)" />
      <path d="M13.5 7.5 19 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="18.5" cy="5.5" r="2.2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function IconVolleyball({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 8.5 12 11l7.5-2.5M12 3v8M6 16l6-5 6 5M4.5 13.5 12 11l7.5 2.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 20h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

function IconTrack({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M5 19c2.5-4 5-6 7-6s4.5 2 7 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8 13c1.2-2.2 2.5-3.5 4-3.5s2.8 1.3 4 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.6" />
      <circle cx="12" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.5 9.8 8.5 13M13.5 9.8l2 3.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

const ICONS: Record<SportId, ComponentType<{ className?: string }>> = {
  football: IconFootball,
  basketball: IconBasketball,
  tennis: IconTennis,
  volleyball: IconVolleyball,
  track: IconTrack,
};

export function SportIcon({ sport, className, active }: SportIconProps) {
  const Icon = ICONS[sport];
  return (
    <Icon
      className={cn(
        "sport-nav-icon h-[18px] w-[18px] shrink-0",
        active && "sport-nav-icon-active",
        className
      )}
    />
  );
}
