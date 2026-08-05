import Link from "next/link";
import { Shield } from "lucide-react";

/** Persistent strip so elevated sessions are never mistaken for a normal account. */
export function AdminModeBanner() {
  return (
    <div className="border-b border-accent bg-accent text-white">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <p className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wide">
          <Shield className="h-3.5 w-3.5" />
          Admin Mode active — staff actions are elevated
        </p>
        <Link
          href="/admin"
          className="rounded-full bg-white/15 px-3 py-1 font-display text-[11px] font-bold uppercase tracking-wide hover:bg-white/25"
        >
          Open admin
        </Link>
      </div>
    </div>
  );
}
