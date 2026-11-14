"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { tiptapToText } from "@/lib/articles";

type VersionRow = {
  id: string;
  version_no: number;
  snapshot: {
    title?: string;
    dek?: string | null;
    body?: unknown;
    byline?: string | null;
  };
  note: string | null;
  created_at: string;
  profiles?: { display_name: string } | null;
};

export function VersionHistory({ articleId }: { articleId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["article-versions", articleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("article_versions")
        .select("id, version_no, snapshot, note, created_at, profiles:created_by(display_name)")
        .eq("article_id", articleId)
        .order("version_no", { ascending: false });
      if (error) throw error;
      return data as unknown as VersionRow[];
    },
  });

  if (isLoading) {
    return <p className="text-sm text-ink-soft">Loading history…</p>;
  }
  if (versions.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        No saved versions yet. A snapshot is stored each time an editor approves
        a release or an edit.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-rule border border-rule">
      {versions.map((v, i) => {
        const prev = versions[i + 1];
        const open = openId === v.id;
        const titleChanged =
          prev && (prev.snapshot.title ?? "") !== (v.snapshot.title ?? "");
        const dekChanged =
          prev && (prev.snapshot.dek ?? "") !== (v.snapshot.dek ?? "");
        const bodyChanged =
          prev &&
          tiptapToText(prev.snapshot.body) !== tiptapToText(v.snapshot.body);

        return (
          <li key={v.id} className="bg-white px-3 py-3">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : v.id)}
              className="flex w-full items-start justify-between gap-3 text-left"
            >
              <div>
                <p className="text-sm font-semibold">
                  v{v.version_no}
                  {v.note ? ` · ${v.note}` : ""}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-soft">
                  {new Date(v.created_at).toLocaleString()}
                  {v.profiles?.display_name
                    ? ` · ${v.profiles.display_name}`
                    : ""}
                </p>
                {prev && (titleChanged || dekChanged || bodyChanged) && (
                  <p className="mt-1 text-[11px] font-semibold text-accent">
                    Changed:{" "}
                    {[
                      titleChanged && "headline",
                      dekChanged && "dek",
                      bodyChanged && "body",
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </div>
              <span className="text-xs text-ink-soft">{open ? "Hide" : "View"}</span>
            </button>
            {open && (
              <div className="mt-3 border-t border-rule pt-3 text-sm">
                <p className="font-serif text-base font-bold leading-snug">
                  {v.snapshot.title}
                </p>
                {v.snapshot.dek && (
                  <p className="mt-1 text-ink-soft">{v.snapshot.dek}</p>
                )}
                <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-xs leading-relaxed text-ink-soft">
                  {tiptapToText(v.snapshot.body) || "(empty body)"}
                </p>
                {prev && (
                  <div className="mt-3 grid gap-2 border border-rule bg-gray-50 p-2 text-[11px] sm:grid-cols-2">
                    <div>
                      <p className="font-bold uppercase tracking-wide text-ink-soft">
                        Previous headline
                      </p>
                      <p className="mt-1">{prev.snapshot.title}</p>
                    </div>
                    <div>
                      <p className="font-bold uppercase tracking-wide text-ink-soft">
                        This headline
                      </p>
                      <p className="mt-1">{v.snapshot.title}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
