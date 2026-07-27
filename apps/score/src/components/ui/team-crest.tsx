import Image from "next/image";
import type { SportId } from "@/lib/utils/sport";
import { SportIcon } from "@/components/ui/sport-icon";
import { cn } from "@/lib/utils/cn";

const sizeMap = {
  xs: { box: "h-4 w-4", px: 16, text: "text-[7px]" },
  sm: { box: "h-6 w-6", px: 24, text: "text-[9px]" },
  md: { box: "h-9 w-9", px: 36, text: "text-[11px]" },
  lg: { box: "h-12 w-12", px: 48, text: "text-sm" },
};

export function TeamCrest({
  code,
  logoUrl,
  alt,
  size = "md",
  sport,
}: {
  code: string;
  logoUrl?: string | null;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg";
  /** Renders the sport icon only when no club crest URL is provided */
  sport?: SportId;
}) {
  const s = sizeMap[size];

  if (logoUrl) {
    const isSvg = logoUrl.endsWith(".svg");
    if (isSvg) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={alt ?? code}
          width={s.px}
          height={s.px}
          className={cn("shrink-0 object-contain", s.box)}
        />
      );
    }
    return (
      <Image
        src={logoUrl}
        alt={alt ?? code}
        width={s.px}
        height={s.px}
        className={cn("shrink-0 object-contain", s.box)}
      />
    );
  }

  if (sport) {
    return (
      <SportIcon
        sport={sport}
        size={size === "xs" ? "xs" : size === "lg" ? "lg" : size === "md" ? "md" : "sm"}
        title={alt ?? code}
        className={cn("text-accent", s.box)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-rule bg-white font-bold text-accent",
        s.box,
        s.text
      )}
    >
      {code}
    </div>
  );
}

export function PlayerAvatar({
  firstName,
  lastName,
  avatarUrl,
  size = "md",
}: {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  size?: "sm" | "md";
}) {
  const s = size === "sm" ? { box: "h-8 w-8", px: 32, text: "text-xs" } : { box: "h-10 w-10", px: 40, text: "text-sm" };

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={`${firstName} ${lastName}`}
        width={s.px}
        height={s.px}
        className={cn("shrink-0 rounded-full object-cover", s.box)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-rule bg-surface font-semibold text-accent",
        s.box,
        s.text
      )}
    >
      {firstName[0]}
      {lastName[0]}
    </div>
  );
}
