"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";

/**
 * Thin top progress bar on client navigations so route switches never feel frozen.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [complete, setComplete] = useState(false);
  const first = useRef(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setComplete(false);
    setActive(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setComplete(true);
      hideTimer.current = setTimeout(() => {
        setActive(false);
        setComplete(false);
      }, 220);
    }, 280);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [pathname, searchParams]);

  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[110] h-0.5 overflow-hidden"
      aria-hidden
    >
      <div
        className={cn(
          "h-full origin-left bg-accent transition-transform duration-300 ease-out",
          complete ? "scale-x-100 opacity-0" : "scale-x-[0.72]"
        )}
        style={{ transformOrigin: "left" }}
      />
    </div>
  );
}
