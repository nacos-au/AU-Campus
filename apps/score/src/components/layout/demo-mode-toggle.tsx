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
      <span className="rounded-full border border-accent/30 px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-wide text-accent/60">
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
      title={active ? "Demo fixtures — click for live" : "Live — click for demo"}
      className="flex items-center gap-1.5 rounded-full border border-accent/30 px-1 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide disabled:opacity-50"
    >
      <span className={active ? "text-accent/50" : "text-accent"}>Demo</span>
      <span
        className={`relative h-4 w-7 rounded-full transition-colors ${
          active ? "bg-accent/30" : "bg-brand-green"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${
            active ? "left-0.5" : "left-3.5"
          }`}
        />
      </span>
      <span className={active ? "text-accent" : "text-accent/50"}>Live</span>
    </button>
  );
}
