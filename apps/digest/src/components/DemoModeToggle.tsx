"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setDemoMode } from "@/app/actions/demo-mode";

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
        className="rounded-full border border-rule-dark bg-paper px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink-soft"
        title="Demo mode (no database keys)"
      >
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
      title={active ? "Showing demo fixtures — click for live data" : "Showing live data — click for demo"}
      className="flex items-center gap-1.5 rounded-full border border-rule-dark bg-paper px-1 py-0.5 text-[10px] font-bold uppercase tracking-wide disabled:opacity-50"
    >
      <span className={active ? "text-ink-soft" : "text-ink"}>Demo</span>
      <span
        className={`relative h-4 w-7 rounded-full transition-colors ${
          active ? "bg-ink-soft/40" : "bg-accent"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-paper shadow transition-transform ${
            active ? "left-0.5" : "left-3.5"
          }`}
        />
      </span>
      <span className={active ? "text-ink" : "text-ink-soft"}>Live</span>
    </button>
  );
}
