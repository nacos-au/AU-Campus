"use client";

import { useCallback, useEffect, useState } from "react";
import type { ScoreFeedbackRow } from "@/lib/data/feedback";

export function AdminFeedbackList() {
  const [rows, setRows] = useState<ScoreFeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/feedback");
      const json = (await res.json()) as { feedback?: ScoreFeedbackRow[]; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not load feedback");
        setRows([]);
        return;
      }
      setRows(json.feedback ?? []);
    } catch {
      setError("Network error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="table-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-4">
        <div>
          <h2 className="font-display text-lg font-extrabold">Feedback</h2>
          <p className="text-sm text-accent/65">Bug reports and ideas from match / live / keeper pages.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-rule px-3 py-1.5 text-xs font-bold disabled:opacity-40"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && <p className="px-5 py-3 text-sm font-semibold text-red-600">{error}</p>}

      {!loading && rows.length === 0 && !error && (
        <p className="px-5 py-8 text-center text-sm text-accent/60">No feedback yet.</p>
      )}

      <ul className="divide-y divide-rule">
        {rows.map((row) => (
          <li key={row.id} className="px-5 py-4">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-accent/50">
              <span className="rounded-full bg-surface px-2 py-0.5 text-accent">{row.category}</span>
              <span>{new Date(row.created_at).toLocaleString("en-GB")}</span>
              {row.page_path && <span>{row.page_path}</span>}
              {row.match_id && <span>match {row.match_id.slice(0, 8)}</span>}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-accent">{row.message}</p>
            {row.contact_email && (
              <p className="mt-1 text-xs text-accent/60">{row.contact_email}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
