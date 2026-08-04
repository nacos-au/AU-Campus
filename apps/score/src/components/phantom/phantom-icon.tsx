import { cn } from "@/lib/utils/cn";

/**
 * Premium Phantom mark — dual-orbit silhouette (ghost trail around a pitch ball).
 * No emoji; works at navbar sizes.
 */
export function PhantomIcon({
  className,
  size = 22,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <circle cx="12" cy="12" r="7.2" stroke="currentColor" strokeWidth="1.6" opacity="0.35" />
      <circle cx="12" cy="12" r="4.6" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 7.4c1.1 1.2 1.7 2.5 1.7 4.6S13.1 15.4 12 16.6c-1.1-1.2-1.7-2.5-1.7-4.6S10.9 8.6 12 7.4Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M4.2 9.2c1.4-2.8 4-4.4 7.8-4.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M19.8 14.8c-1.4 2.8-4 4.4-7.8 4.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}
