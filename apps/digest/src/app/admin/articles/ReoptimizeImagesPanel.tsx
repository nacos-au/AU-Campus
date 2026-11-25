"use client";

import { useState } from "react";
import { btn } from "@/components/admin/ui";

type BatchResult = {
  scanned: number;
  updated: number;
  skipped: number;
  imagesRewritten: number;
  errors: string[];
  moreRemaining: boolean;
  nextOffset: number;
};

export function ReoptimizeImagesPanel() {
  const [busy, setBusy] = useState(false);
  const [offset, setOffset] = useState(0);
  const [totals, setTotals] = useState({
    updated: 0,
    imagesRewritten: 0,
  });
  const [last, setLast] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runBatch() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reoptimize-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 5, offset }),
      });
      const data = (await res.json()) as BatchResult & { error?: string };
      if (!res.ok) throw new Error(data.error || "Reoptimize failed");
      setLast(data);
      setOffset(data.nextOffset);
      setTotals((t) => ({
        updated: t.updated + data.updated,
        imagesRewritten: t.imagesRewritten + data.imagesRewritten,
      }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 border border-rule bg-paper px-4 py-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-ink">Reoptimize images</p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
            Re-encode oversized covers and body photos in storage (max 1280px,
            ~75 quality). Runs 5 articles at a time — click again if more remain.
          </p>
        </div>
        <button
          type="button"
          disabled={busy || (last != null && !last.moreRemaining)}
          onClick={runBatch}
          className={`${btn.secondary} shrink-0 disabled:opacity-60`}
        >
          {busy
            ? "Working…"
            : last == null
              ? "Reoptimize batch"
              : last.moreRemaining
                ? "Run next batch"
                : "Caught up"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-accent">{error}</p>}
      {last && !error && (
        <p className="mt-2 text-xs text-ink-soft">
          This batch: scanned {last.scanned} · updated {last.updated} · skipped{" "}
          {last.skipped} · {last.imagesRewritten} image
          {last.imagesRewritten === 1 ? "" : "s"} rewritten
          {totals.updated > 0
            ? ` · session total ${totals.updated} articles / ${totals.imagesRewritten} images`
            : ""}
          {last.moreRemaining ? " · more remaining" : " · done"}
        </p>
      )}
      {last?.errors?.length ? (
        <ul className="mt-1 list-disc pl-4 text-xs text-ink-soft">
          {last.errors.slice(0, 5).map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
