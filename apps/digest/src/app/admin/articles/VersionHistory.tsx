"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { tiptapToText } from "@/lib/articles";
import { hasDiffChanges, wordDiff, type DiffSeg } from "@/lib/textDiff";

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

type CompareMode = "inline" | "side";

function InlineDiff({ segs }: { segs: DiffSeg[] }) {
  if (!hasDiffChanges(segs)) {
    return (
      <span className="text-ink-soft">(no change)</span>
    );
  }
  return (
    <span className="leading-relaxed">
      {segs.map((s, i) => {
        if (s.type === "equal") return <span key={i}>{s.text}</span>;
        if (s.type === "add") {
          return (
            <mark
              key={i}
              className="rounded-sm bg-emerald-100 text-emerald-950 ring-1 ring-emerald-200"
            >
              {s.text}
            </mark>
          );
        }
        return (
          <del
            key={i}
            className="rounded-sm bg-rose-100 text-rose-900 decoration-rose-400 ring-1 ring-rose-200"
          >
            {s.text}
          </del>
        );
      })}
    </span>
  );
}

function SidePanel({
  label,
  text,
  tone,
}: {
  label: string;
  text: string;
  tone: "old" | "new";
}) {
  return (
    <div
      className={
        tone === "old"
          ? "border border-rose-200 bg-rose-50/60 p-2"
          : "border border-emerald-200 bg-emerald-50/60 p-2"
      }
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed">
        {text || "(empty)"}
      </p>
    </div>
  );
}

function FieldCompare({
  label,
  before,
  after,
  mode,
}: {
  label: string;
  before: string;
  after: string;
  mode: CompareMode;
}) {
  const segs = useMemo(() => wordDiff(before, after), [before, after]);
  const changed = hasDiffChanges(segs);

  return (
    <div className="mt-3">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-ink-soft">
        {label}
        {changed ? (
          <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-accent">
            changed
          </span>
        ) : (
          <span className="text-[10px] font-normal normal-case tracking-normal">
            unchanged
          </span>
        )}
      </p>
      {mode === "inline" ? (
        <div className="mt-1 whitespace-pre-wrap text-sm">
          <InlineDiff segs={segs} />
        </div>
      ) : (
        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          <SidePanel label="Previous" text={before} tone="old" />
          <SidePanel label="This version" text={after} tone="new" />
        </div>
      )}
    </div>
  );
}

export function VersionHistory({ articleId }: { articleId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<CompareMode>("inline");
  const [compareA, setCompareA] = useState<string>("");
  const [compareB, setCompareB] = useState<string>("");

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["article-versions", articleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("article_versions")
        .select(
          "id, version_no, snapshot, note, created_at, profiles:created_by(display_name)"
        )
        .eq("article_id", articleId)
        .order("version_no", { ascending: false });
      if (error) throw error;
      return data as unknown as VersionRow[];
    },
  });

  const pickA = versions.find((v) => v.id === compareA) ?? null;
  const pickB = versions.find((v) => v.id === compareB) ?? null;
  const canCompare = pickA && pickB && pickA.id !== pickB.id;

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-ink-soft">
          <span className="mr-2 inline-flex items-center gap-1">
            <mark className="rounded-sm bg-emerald-100 px-1 text-emerald-950">
              added
            </mark>
            <del className="rounded-sm bg-rose-100 px-1 text-rose-900">
              removed
            </del>
          </span>
          vs previous version when you expand a row.
        </p>
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("inline")}
            className={
              mode === "inline"
                ? "border border-ink bg-ink px-2 py-1 font-semibold text-white"
                : "border border-rule px-2 py-1 text-ink-soft hover:border-ink"
            }
          >
            Inline
          </button>
          <button
            type="button"
            onClick={() => setMode("side")}
            className={
              mode === "side"
                ? "border border-ink bg-ink px-2 py-1 font-semibold text-white"
                : "border border-rule px-2 py-1 text-ink-soft hover:border-ink"
            }
          >
            Side by side
          </button>
        </div>
      </div>

      {versions.length >= 2 && (
        <div className="border border-rule bg-gray-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            Compare any two versions
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="text-xs">
              From
              <select
                className="mt-1 block border border-rule bg-white px-2 py-1.5"
                value={compareA}
                onChange={(e) => setCompareA(e.target.value)}
              >
                <option value="">Select…</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.version_no}
                    {v.note ? ` · ${v.note}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              To
              <select
                className="mt-1 block border border-rule bg-white px-2 py-1.5"
                value={compareB}
                onChange={(e) => setCompareB(e.target.value)}
              >
                <option value="">Select…</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.version_no}
                    {v.note ? ` · ${v.note}` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {canCompare && pickA && pickB && (
            <div className="mt-3 border-t border-rule pt-3">
              <p className="text-sm font-semibold">
                v{pickA.version_no} → v{pickB.version_no}
              </p>
              <FieldCompare
                label="Headline"
                before={pickA.snapshot.title ?? ""}
                after={pickB.snapshot.title ?? ""}
                mode={mode}
              />
              <FieldCompare
                label="Dek"
                before={pickA.snapshot.dek ?? ""}
                after={pickB.snapshot.dek ?? ""}
                mode={mode}
              />
              <FieldCompare
                label="Body"
                before={tiptapToText(pickA.snapshot.body)}
                after={tiptapToText(pickB.snapshot.body)}
                mode={mode}
              />
            </div>
          )}
        </div>
      )}

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
                <span className="text-xs text-ink-soft">
                  {open ? "Hide" : "Compare"}
                </span>
              </button>
              {open && prev && (
                <div className="mt-3 border-t border-rule pt-2">
                  <p className="text-[11px] text-ink-soft">
                    Diff vs v{prev.version_no}
                  </p>
                  <FieldCompare
                    label="Headline"
                    before={prev.snapshot.title ?? ""}
                    after={v.snapshot.title ?? ""}
                    mode={mode}
                  />
                  <FieldCompare
                    label="Dek"
                    before={prev.snapshot.dek ?? ""}
                    after={v.snapshot.dek ?? ""}
                    mode={mode}
                  />
                  <FieldCompare
                    label="Body"
                    before={tiptapToText(prev.snapshot.body)}
                    after={tiptapToText(v.snapshot.body)}
                    mode={mode}
                  />
                </div>
              )}
              {open && !prev && (
                <div className="mt-3 border-t border-rule pt-3 text-sm">
                  <p className="font-serif text-base font-bold leading-snug">
                    {v.snapshot.title}
                  </p>
                  {v.snapshot.dek && (
                    <p className="mt-1 text-ink-soft">{v.snapshot.dek}</p>
                  )}
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-ink-soft">
                    {tiptapToText(v.snapshot.body) || "(empty body)"}
                  </p>
                  <p className="mt-2 text-[11px] text-ink-soft">
                    First snapshot — nothing earlier to compare.
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
