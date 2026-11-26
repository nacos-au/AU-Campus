"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, CalendarClock, History, Undo2 } from "lucide-react";
import {
  buildShiftEdits,
  formatWat,
  isLockedStatus,
  isoToWatInput,
  isValidIso,
  planReschedule,
  selectFromHere,
  selectSameWeek,
  watInputToIso,
  watWeekKey,
  type ScheduleRow,
} from "@/lib/schedule/shift-fixtures";
import type { ScheduleHistoryBatch } from "@/lib/data/fixture-schedule";
import { cn } from "@/lib/utils/cn";

const inputClass = "rounded-lg border border-rule px-3 py-2 text-sm";

type Filter = "open" | "all";

function weekLabel(weekKey: string): string {
  const start = new Date(`${weekKey}T00:00:00Z`);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  });
  return `${f.format(start)} – ${f.format(end)}`;
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "postponed"
      ? "bg-amber-100 text-amber-900"
      : status === "live" || status === "paused"
        ? "bg-red-100 text-red-800"
        : status === "completed"
          ? "bg-accent/10 text-accent/70"
          : "bg-accent/[0.06] text-accent/60";
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 font-display text-[11px] font-bold capitalize",
        tone
      )}
    >
      {status}
    </span>
  );
}

export function FixtureScheduleEditor({
  competitionId,
  competitionName,
  rows,
  history,
}: {
  competitionId: string;
  competitionName: string;
  rows: ScheduleRow[];
  history: ScheduleHistoryBatch[];
}) {
  const router = useRouter();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [days, setDays] = useState("1");
  const [hours, setHours] = useState("0");
  const [reason, setReason] = useState("");
  const [filter, setFilter] = useState<Filter>("open");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const plan = useMemo(() => planReschedule(rows, edits), [rows, edits]);

  const visible = useMemo(
    () =>
      filter === "all"
        ? rows
        : rows.filter((r) => !isLockedStatus(r.kind, r.status)),
    [rows, filter]
  );

  const groups = useMemo(() => {
    const out: Array<{ key: string; label: string; rows: ScheduleRow[] }> = [];
    for (const r of visible) {
      const key = isValidIso(r.scheduled_at) ? watWeekKey(r.scheduled_at) : "undated";
      const last = out[out.length - 1];
      if (last && last.key === key) {
        last.rows.push(r);
      } else {
        out.push({ key, label: key === "undated" ? "No date yet" : weekLabel(key), rows: [r] });
      }
    }
    return out;
  }, [visible]);

  const movableCount = rows.filter((r) => !isLockedStatus(r.kind, r.status)).length;

  function setRowEdit(row: ScheduleRow, value: string) {
    const iso = watInputToIso(value);
    setEdits((prev) => {
      const next = { ...prev };
      if (!iso || (isValidIso(row.scheduled_at) && iso === new Date(row.scheduled_at).toISOString())) {
        delete next[row.key];
      } else {
        next[row.key] = iso;
      }
      return next;
    });
    setMessage("");
  }

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function applyShift() {
    setError("");
    setMessage("");
    const d = Number(days);
    const h = Number(hours);
    if (!Number.isFinite(d) || !Number.isFinite(h) || (d === 0 && h === 0)) {
      setError("Enter a number of days (or hours) other than zero. Use a minus sign to move earlier.");
      return;
    }
    if (selected.size === 0) {
      setError("Tick at least one match to shift.");
      return;
    }
    const { edits: shifted, skipped } = buildShiftEdits(rows, selected, d, h);
    setEdits((prev) => ({ ...prev, ...shifted }));
    if (skipped.length) {
      setMessage(
        `${skipped.length} selected fixture${skipped.length === 1 ? " was" : "s were"} skipped (finished, live, or no date).`
      );
    }
  }

  async function apply() {
    setError("");
    setMessage("");
    if (!plan.canApply) return;
    if (!reason.trim()) {
      setError("Add a reason so everyone can see why the date changed.");
      return;
    }
    if (
      !confirm(
        `Move ${plan.changes.length} fixture${plan.changes.length === 1 ? "" : "s"}? The new dates go live on the public site straight away.`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/schedule/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reason.trim(),
          changes: plan.changes.map((c) => ({
            kind: c.kind,
            id: c.id,
            scheduled_at: c.to,
          })),
        }),
      });
      const json = (await res.json()) as { error?: string; changed?: number };
      if (!res.ok) {
        setError(json.error ?? "Could not reschedule");
        return;
      }
      setMessage(
        `Moved ${json.changed ?? plan.changes.length} fixture${(json.changed ?? plan.changes.length) === 1 ? "" : "s"}.`
      );
      setEdits({});
      setSelected(new Set());
      setReason("");
      router.refresh();
    } catch {
      setError("Network error. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="table-card p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
          <CalendarClock className="h-5 w-5 text-accent" />
          Fixtures · {competitionName}
        </h2>
        <p className="mt-1 text-sm opacity-70">
          Change any date and time directly, or tick matches and shift them by days. Nothing
          moves on its own: you choose exactly which matches change. All times are WAT (Lagos).
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-rule bg-accent/[0.03] p-4">
          <div className="text-sm">
            <span className="font-semibold">{selected.size}</span> selected of {movableCount}{" "}
            movable
          </div>
          <label className="block text-sm">
            <span className="block font-semibold">Days</span>
            <input
              type="number"
              step={1}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className={cn(inputClass, "mt-1 w-24")}
            />
          </label>
          <label className="block text-sm">
            <span className="block font-semibold">Hours</span>
            <input
              type="number"
              step={1}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className={cn(inputClass, "mt-1 w-24")}
            />
          </label>
          <button
            type="button"
            onClick={applyShift}
            disabled={busy || selected.size === 0}
            className="btn-filled rounded-full px-4 py-2.5 font-display text-sm font-bold disabled:opacity-40"
          >
            Shift selected
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set(rows.filter((r) => !isLockedStatus(r.kind, r.status)).map((r) => r.key)))}
            className="rounded-full border border-rule px-3 py-2 font-display text-xs font-bold"
          >
            Select all movable
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            disabled={selected.size === 0}
            className="rounded-full border border-rule px-3 py-2 font-display text-xs font-bold disabled:opacity-40"
          >
            Clear selection
          </button>
          <label className="ml-auto block text-sm">
            <span className="block font-semibold">Show</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
              className={cn(inputClass, "mt-1")}
            >
              <option value="open">Upcoming and postponed</option>
              <option value="all">Everything (incl. finished)</option>
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs text-accent/60">
          Shifts are worked out from the saved dates and shown in the preview below. Use a minus
          sign (e.g. -1) to move earlier.
        </p>
      </div>

      <div className="table-card overflow-hidden">
        {visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-accent/60">
            {rows.length === 0
              ? "This competition has no fixtures yet. Add them from Competitions."
              : "Nothing to move. Switch the filter to see finished matches."}
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.key}>
              <div className="border-b border-rule bg-accent/[0.04] px-4 py-2 font-display text-xs font-bold uppercase tracking-wide text-accent/60">
                {g.key === "undated" ? g.label : `Week of ${g.label}`}
              </div>
              <ul className="divide-y divide-rule">
                {g.rows.map((r) => {
                  const locked = isLockedStatus(r.kind, r.status);
                  const edited = edits[r.key];
                  const value = isoToWatInput(edited ?? r.scheduled_at);
                  const warnings = plan.warnings.filter((w) => w.key === r.key);
                  return (
                    <li
                      key={r.key}
                      className={cn(
                        "flex flex-wrap items-center gap-3 px-4 py-3 text-sm",
                        locked && "opacity-55",
                        edited && "bg-accent/[0.05]"
                      )}
                    >
                      <input
                        type="checkbox"
                        aria-label={`Select ${r.title}`}
                        disabled={locked || busy}
                        checked={selected.has(r.key)}
                        onChange={() => toggle(r.key)}
                        className="h-4 w-4"
                      />
                      <div className="min-w-[220px] flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display font-bold">{r.title}</span>
                          <StatusPill status={r.status} />
                          {r.kind === "bracket" && (
                            <span className="rounded-full bg-accent/10 px-2 py-0.5 font-display text-[11px] font-bold text-accent/70">
                              Knockout
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-accent/55">
                          {[r.phase, r.venue_name].filter(Boolean).join(" · ") || "-"}
                          {r.reschedule_count > 0 && r.original_scheduled_at && (
                            <>
                              {" · "}
                              <span className="font-semibold text-amber-800">
                                moved {r.reschedule_count}x, originally{" "}
                                {formatWat(r.original_scheduled_at)}
                              </span>
                            </>
                          )}
                        </p>
                        {warnings.map((w, i) => (
                          <p
                            key={i}
                            className={cn(
                              "mt-1 flex items-start gap-1 text-xs",
                              w.level === "error" ? "text-red-600" : "text-amber-800"
                            )}
                          >
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                            {w.message}
                          </p>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="datetime-local"
                          disabled={locked || busy}
                          value={value}
                          onChange={(e) => setRowEdit(r, e.target.value)}
                          className={cn(inputClass, edited && "border-accent")}
                        />
                        {edited && (
                          <button
                            type="button"
                            title="Undo this change"
                            onClick={() =>
                              setEdits((prev) => {
                                const next = { ...prev };
                                delete next[r.key];
                                return next;
                              })
                            }
                            className="rounded-full border border-rule p-2"
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {!locked && (
                          <>
                            <button
                              type="button"
                              onClick={() => setSelected(new Set(selectFromHere(rows, r.key)))}
                              className="rounded-full border border-rule px-2.5 py-1.5 font-display text-[11px] font-bold"
                              title="Select this match and every later one"
                            >
                              This + after
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelected(new Set(selectSameWeek(rows, r.key)))}
                              className="rounded-full border border-rule px-2.5 py-1.5 font-display text-[11px] font-bold"
                              title="Select every match in this week"
                            >
                              This week
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>

      {(plan.changes.length > 0 || plan.warnings.length > 0) && (
        <div className="table-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-lg font-extrabold">
              Preview · {plan.changes.length} change{plan.changes.length === 1 ? "" : "s"}
            </h3>
            <button
              type="button"
              onClick={() => setEdits({})}
              disabled={busy}
              className="rounded-full border border-rule px-3 py-1.5 font-display text-xs font-bold"
            >
              Discard all changes
            </button>
          </div>

          <ul className="mt-3 divide-y divide-rule rounded-lg border border-rule">
            {plan.changes.map((c) => (
              <li key={c.key} className="flex flex-wrap items-center gap-2 px-4 py-2 text-sm">
                <span className="font-display font-bold">{c.title}</span>
                <span className="text-xs text-accent/60">{formatWat(c.from)}</span>
                <ArrowRight className="h-3.5 w-3.5 text-accent/50" />
                <span className="text-xs font-semibold text-accent">{formatWat(c.to)}</span>
              </li>
            ))}
          </ul>

          {plan.warnings.filter((w) => w.level === "error").map((w, i) => (
            <p key={`e${i}`} className="mt-2 text-sm font-semibold text-red-600">
              {w.message}
            </p>
          ))}
          {plan.warnings.filter((w) => w.level === "warn").length > 0 && (
            <p className="mt-2 text-xs text-amber-800">
              {plan.warnings.filter((w) => w.level === "warn").length} warning
              {plan.warnings.filter((w) => w.level === "warn").length === 1 ? "" : "s"} shown on the
              rows above. You can still apply.
            </p>
          )}

          <label className="mt-4 block text-sm">
            <span className="font-semibold">Reason (shown on the match page)</span>
            <textarea
              rows={2}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Pitch unplayable after rain, moved back two days"
              className={cn(inputClass, "mt-1 w-full")}
            />
          </label>

          <button
            type="button"
            onClick={() => void apply()}
            disabled={busy || !plan.canApply || !reason.trim()}
            className="btn-filled mt-4 rounded-full px-5 py-2.5 font-display text-sm font-bold disabled:opacity-40"
          >
            {busy ? "Saving..." : `Apply ${plan.changes.length} change${plan.changes.length === 1 ? "" : "s"}`}
          </button>
        </div>
      )}

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      {message && <p className="text-sm font-semibold text-green-700">{message}</p>}

      <div className="table-card p-6">
        <h3 className="flex items-center gap-2 font-display text-lg font-extrabold">
          <History className="h-5 w-5 text-accent" />
          History
        </h3>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-accent/60">No fixtures have been moved yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-rule rounded-lg border border-rule">
            {history.map((h) => (
              <li key={h.batch_id} className="px-4 py-2.5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display font-bold">
                    {h.count} fixture{h.count === 1 ? "" : "s"} moved
                  </span>
                  <span className="text-xs text-accent/55">
                    {formatWat(h.created_at, true)}
                    {h.changed_by_name ? ` · ${h.changed_by_name}` : ""}
                  </span>
                </div>
                <p className="text-xs text-accent/70">{h.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
