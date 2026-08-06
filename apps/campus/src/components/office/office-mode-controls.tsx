"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setOfficeMode } from "@/app/actions/admin-mode";

export function EnterOfficeButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const ok = window.confirm(
          "Enter Campus Office?\n\nYou will unlock super-admin tools: grant roles, launch Score/Digest admin, and manage staff. Only use this when you intend to administer the platform."
        );
        if (!ok) return;
        start(async () => {
          const res = await setOfficeMode(true);
          if ("error" in res) {
            window.alert(res.error);
            return;
          }
          router.refresh();
        });
      }}
      className="rounded-full bg-ink px-6 py-3 font-display text-sm font-bold text-white transition hover:bg-accent disabled:opacity-50"
    >
      {pending ? "Opening…" : "Enter Office Mode"}
    </button>
  );
}

export function ExitOfficeButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        start(async () => {
          await setOfficeMode(false);
          router.push("/");
          router.refresh();
        });
      }}
      className={
        className ??
        "rounded-full border border-white/25 px-3 py-1.5 text-xs font-bold text-white/90 transition hover:bg-white/10"
      }
    >
      {pending ? "…" : "Exit Office"}
    </button>
  );
}
