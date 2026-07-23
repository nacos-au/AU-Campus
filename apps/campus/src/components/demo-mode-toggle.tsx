"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setPreferDemo } from "@/app/actions/demo-mode";

export function DemoModeToggle({ preferDemo }: { preferDemo: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await setPreferDemo(!preferDemo);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      title="Choose demo or live when opening Digest and Score"
      className="flex items-center gap-1.5 rounded-full border-2 border-[var(--accent)] px-1 py-0.5 text-[10px] font-bold uppercase tracking-wide disabled:opacity-50"
    >
      <span className={preferDemo ? "opacity-100" : "opacity-40"}>Demo</span>
      <span
        className={`relative h-4 w-7 rounded-full transition-colors ${
          preferDemo ? "bg-[var(--accent)]/40" : "bg-[var(--brand-green)]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${
            preferDemo ? "left-0.5" : "left-3.5"
          }`}
        />
      </span>
      <span className={preferDemo ? "opacity-40" : "opacity-100"}>Live</span>
    </button>
  );
}
