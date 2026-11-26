"use client";

import { usePathname } from "next/navigation";
import { site } from "@/lib/site";

/**
 * The site name in the global header. On /weekly the issue has its own
 * nameplate, so this shrinks to avoid showing the brand twice.
 */
export function SiteMasthead({
  className,
  compactClassName,
}: {
  className: string;
  compactClassName: string;
}) {
  const pathname = usePathname();
  const compact = pathname === "/weekly" || pathname.startsWith("/weekly/");
  return <span className={compact ? compactClassName : className}>{site.masthead}</span>;
}
