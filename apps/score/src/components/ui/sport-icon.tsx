import type { SportId } from "@/lib/utils/sport";
import { SPORT_ICON_MAP, SPORT_ICON_SIZES, type SportIconSize } from "@/lib/icons/sport-icons";
import { cn } from "@/lib/utils/cn";

export function SportIcon({
  sport,
  size = "sm",
  className,
  active,
  title,
}: {
  sport: SportId;
  size?: SportIconSize;
  className?: string;
  active?: boolean;
  title?: string;
}) {
  const Icon = SPORT_ICON_MAP[sport];
  const px = SPORT_ICON_SIZES[size];

  return (
    <Icon
      size={px}
      aria-hidden={title ? undefined : true}
      title={title}
      className={cn(
        "sport-nav-icon shrink-0",
        active && "sport-nav-icon-active",
        className
      )}
    />
  );
}
