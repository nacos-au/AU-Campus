"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { articlePublicPath } from "@/lib/articles";
import { IconSearch } from "./icons";

interface Hit {
  id: string;
  slug: string;
  short_code?: string | null;
  title: string;
  dek: string | null;
  sections: { name: string } | null;
}

/** Plain icon → expands inline into a bar with a brand Go button; results drop down beneath. */
export function NavSearch({ inline = true }: { inline?: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(!inline);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [asked, setAsked] = useState("");

  useEffect(() => {
    if (!open || !inline) return;
    inputRef.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, inline]);

  function close() {
    if (inline) setOpen(false);
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
      .select("id, slug, short_code, title, dek, sections(name)")
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
    <div ref={rootRef} className="relative">
      <form onSubmit={run} className="flex h-9 items-center gap-2">
        <button
          type={open ? "submit" : "button"}
          onClick={open ? undefined : () => setOpen(true)}
          aria-label="Search"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded text-ink transition-colors ${
            open ? "bg-gray-100" : "hover:bg-gray-100"
          }`}
        >
          <IconSearch className="h-[18px] w-[18px]" />
        </button>
        {open && (
          <>
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="search"
              placeholder="Search"
              className="h-9 w-40 min-w-0 flex-1 rounded border-2 border-ink px-3 text-sm focus:outline-none sm:w-52"
            />
            <button
              type="submit"
              disabled={!q.trim() || loading}
              className="h-9 shrink-0 rounded bg-accent px-3 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? "…" : "Go"}
            </button>
          </>
        )}
      </form>

      {open && asked && !loading && hits && (
        <div className="absolute left-0 top-11 z-50 w-[min(28rem,calc(100vw-2rem))] max-h-[60vh] overflow-y-auto border border-rule-dark bg-paper shadow-xl">
          {hits.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-soft">
              No stories matched “{asked}”.
            </p>
          ) : (
            <ul className="divide-y divide-rule">
              {hits.map((a) => (
                <li key={a.id}>
                  <Link
                    href={articlePublicPath(a)}
                    onClick={close}
                    className="block px-4 py-3 hover:bg-gray-50"
                  >
                    {a.sections?.name && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                        {a.sections.name}
                      </span>
                    )}
                    <span className="block font-serif text-base font-bold leading-snug">
                      {a.title}
                    </span>
                    {a.dek && (
                      <span className="line-clamp-1 text-xs text-ink-soft">
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
  );
}
