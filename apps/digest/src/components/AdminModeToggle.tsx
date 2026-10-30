"use client";

import { useConfirm } from "@/components/ConfirmDialog";
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
  const { confirm } = useConfirm();

  if (!canUse) return null;

  async function toggle() {
    setError("");
    const ok = await confirm(
      active
        ? {
            title: "Exit Admin Mode?",
            body: "You’ll return to the normal reader view. You can come back any time.",
            confirmLabel: "Exit",
          }
        : {
            title: "Enter Admin Mode?",
            body: "Opens the newsroom with editing tools for articles, editions and team settings.",
            confirmLabel: "Enter",
          }
    );
    if (!ok) return;

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
