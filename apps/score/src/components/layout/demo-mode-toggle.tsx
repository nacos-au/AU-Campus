"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setDemoMode } from "@/app/actions/demo-mode";
import { cn } from "@/lib/utils/cn";

/**
 * Staging data-mode switch. Lives in the footer (same placement as Digest)
 * so the header stays focused on navigation.
 */
export function DemoModeToggle({
  active,
  canToggle,
}: {
  active: boolean;
  canToggle: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!canToggle) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-white px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-wide text-accent/70"
        title="Demo mode (no database keys)"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-accent/50" aria-hidden />
        Demo
      </span>
    );
  }

  function toggle() {
    startTransition(async () => {
      await setDemoMode(!active);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      role="switch"
      aria-checked={!active}
      aria-label={active ? "Showing demo fixtures — switch to live data" : "Showing live data — switch to demo"}
      title={active ? "Demo fixtures — click for live" : "Live — click for demo"}
      className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-white py-0.5 pl-2.5 pr-1 font-display text-[10px] font-bold uppercase tracking-wide transition-opacity disabled:opacity-50"
    >
      <span className={active ? "text-accent" : "text-accent/45"}>Demo</span>
      <span
        className={cn(
          "relative h-4 w-7 rounded-full transition-colors",
          active ? "bg-accent/30" : "bg-[var(--brand-green)]"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform",
            active ? "left-0.5" : "left-3.5"
          )}
        />
      </span>
      <span className={cn("pr-1.5", active ? "text-accent/45" : "text-accent")}>Live</span>
    </button>
  );
}
