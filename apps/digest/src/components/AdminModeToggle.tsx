"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setAdminMode } from "@/app/actions/admin-mode";

/**
 * Visible only to newsroom staff. Normal browsing stays non-admin until they confirm.
 */
export function AdminModeToggle({
  canUse,
  active,
}: {
  canUse: boolean;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  if (!canUse) return null;

  function toggle() {
    setError("");
    if (!active) {
      const ok = window.confirm(
        "Enter Admin Mode?\n\nYou will open the newsroom with elevated tools. Use this only when you intend to edit articles, editions, or team settings — not for normal reading."
      );
      if (!ok) return;
    } else {
      const ok = window.confirm("Exit Admin Mode and return to your normal account view?");
      if (!ok) return;
    }

    startTransition(async () => {
      const result = await setAdminMode(!active);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        title={active ? "Exit Admin Mode" : "Enter Admin Mode"}
        className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 ${
          active
            ? "border-accent bg-accent text-white"
            : "border-rule-dark bg-paper text-ink"
        }`}
      >
        {active ? "Admin on" : "Admin"}
      </button>
      {error && (
        <p className="absolute right-0 top-full z-50 mt-1 w-56 border border-accent/30 bg-paper px-2 py-1 text-[11px] font-semibold text-accent shadow">
          {error}
        </p>
      )}
    </div>
  );
}
