"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { IconSearch } from "./icons";

interface Hit {
  id: string;
  slug: string;
  title: string;
  dek: string | null;
  sections: { name: string } | null;
}

/** Icon-only trigger → search bar with brand Go button → results modal. */
export function NavSearch({ withLabel = false }: { withLabel?: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [asked, setAsked] = useState("");

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setHits(null);
    setQ("");
    setAsked("");
  }

  async function run(e: FormEvent) {
    e.preventDefault();
    const needle = q.trim().toLowerCase();
    if (!needle) return;
    setLoading(true);
    setAsked(q.trim());
    const { data } = await supabase
      .from("articles")
      .select("id, slug, title, dek, sections(name)")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(100);
    const all = (data ?? []) as unknown as Hit[];
    setHits(
      all
        .filter(
          (a) =>
            a.title.toLowerCase().includes(needle) ||
            (a.dek ?? "").toLowerCase().includes(needle)
        )
        .slice(0, 30)
    );
    setLoading(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className={
          withLabel
            ? "flex w-full items-center gap-3 border-b border-rule px-4 py-3 text-sm text-ink-soft"
            : "flex h-9 w-9 items-center justify-center rounded bg-gray-100 text-ink hover:bg-rule"
        }
      >
        <IconSearch className="h-5 w-5" />
        {withLabel && "Search"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex flex-col">
          <button
            aria-label="Close search"
            className="absolute inset-0 bg-ink/40"
            onClick={close}
          />
          <div className="relative mx-auto mt-0 w-full max-w-2xl bg-paper px-3 pb-4 pt-3 shadow-2xl sm:mt-16">
            <form onSubmit={run} className="flex items-center gap-2">
              <IconSearch className="h-5 w-5 shrink-0 text-ink" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                type="search"
                placeholder="Search"
                className="min-w-0 flex-1 rounded border-2 border-ink px-3 py-2.5 text-base focus:outline-none"
              />
              <button
                type="submit"
                disabled={!q.trim() || loading}
                className="shrink-0 rounded bg-accent px-4 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {loading ? "…" : "Go"}
              </button>
            </form>

            {asked && !loading && hits && (
              <div className="mt-4 max-h-[60vh] overflow-y-auto border-t border-rule">
                {hits.length === 0 ? (
                  <p className="py-8 text-center text-sm text-ink-soft">
                    No stories matched “{asked}”.
                  </p>
                ) : (
                  <ul className="divide-y divide-rule">
                    {hits.map((a) => (
                      <li key={a.id}>
                        <Link
                          href={`/article/${a.slug}`}
                          onClick={close}
                          className="block py-3 hover:bg-gray-50"
                        >
                          {a.sections?.name && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                              {a.sections.name}
                            </span>
                          )}
                          <span className="block font-serif text-lg font-bold leading-snug">
                            {a.title}
                          </span>
                          {a.dek && (
                            <span className="line-clamp-1 text-sm text-ink-soft">
                              {a.dek}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
