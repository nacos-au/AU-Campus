import { IconUser } from "./icons";

/** Small circular avatar — never full-view / lightbox. */
export function ProfileAvatar({
  url,
  name,
  size = "md",
  className = "",
}: {
  url?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim =
    size === "sm"
      ? "h-8 w-8 text-[11px]"
      : size === "lg"
        ? "h-20 w-20 text-xl"
        : "h-10 w-10 text-sm";

  const initials = (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- small avatar; no lightbox
      <img
        src={url}
        alt=""
        width={size === "lg" ? 80 : size === "sm" ? 32 : 40}
        height={size === "lg" ? 80 : size === "sm" ? 32 : 40}
        className={`${dim} shrink-0 rounded-full object-cover ${className}`}
        draggable={false}
      />
    );
  }

  if (initials) {
    return (
      <span
        className={`flex ${dim} shrink-0 items-center justify-center rounded-full bg-ink font-bold text-paper ${className}`}
        aria-hidden
      >
        {initials}
      </span>
    );
  }

  return (
    <span
      className={`flex ${dim} shrink-0 items-center justify-center rounded-full bg-[#f0f0f0] text-ink/50 ${className}`}
      aria-hidden
    >
      <IconUser className={size === "lg" ? "h-10 w-10" : "h-5 w-5"} />
    </span>
  );
}
