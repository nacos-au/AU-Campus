import Link from "next/link";

/** Persistent strip so elevated sessions are never mistaken for a normal account. */
export function AdminModeBanner() {
  return (
    <div className="border-b border-accent bg-accent text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2">
        <p className="text-[11px] font-bold uppercase tracking-wider">
          Admin Mode active — newsroom actions are elevated
        </p>
        <Link
          href="/admin"
          className="border border-white/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wider hover:bg-white/10"
        >
          Open newsroom
        </Link>
      </div>
    </div>
  );
}
