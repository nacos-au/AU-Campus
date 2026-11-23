"use client";

import { useConfirm } from "@/components/ConfirmDialog";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setAdminMode } from "@/app/actions/admin-mode";

/**
 * Super admin / Digest ops only. Elevates to full admin while on;
 * normal browsing uses the account’s desk role (writer/editor).
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
            body: "You’ll return to your desk role (writer/editor). Newsroom stays available at that level.",
            confirmLabel: "Exit",
          }
        : {
            title: "Enter Admin Mode?",
            body: "Elevates you to Digest admin — Team, full ops, and platform tools. Use only when you need superadmin powers.",
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
        title={
          active
            ? "Exit Admin Mode — back to desk role"
            : "Admin Mode — elevate to Digest admin"
        }
        aria-label={active ? "Exit Admin Mode" : "Enter Admin Mode"}
        className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 ${
          active
            ? "border-accent bg-accent text-white"
            : "border-rule-dark bg-paper text-ink"
        }`}
      >
        <span className="hidden sm:inline">{active ? "Admin Mode on" : "Admin Mode"}</span>
        <span className="sm:hidden">{active ? "Admin on" : "Admin"}</span>
      </button>
      {error && (
        <p className="absolute right-0 top-full z-50 mt-1 w-56 border border-accent/30 bg-paper px-2 py-1 text-[11px] font-semibold text-accent shadow">
          {error}
        </p>
      )}
    </div>
  );
}
