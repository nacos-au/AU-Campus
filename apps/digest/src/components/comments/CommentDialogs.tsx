"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  COMMENT_LIMITS,
  REPORT_REASONS,
  SUSPEND_OPTIONS,
  type CommentData,
  type ReportReason,
  type SuspendDuration,
} from "@/lib/comments";
import { Modal, dialogBtn } from "./Modal";

const fieldCls =
  "mt-1 block w-full border border-rule-dark px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none";

export function ReportDialog({
  commentId,
  onClose,
  onDone,
}: {
  commentId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [reason, setReason] = useState<ReportReason | "">("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc("report_comment", {
      p_comment_id: commentId,
      p_reason: reason,
      p_note: note.trim() || null,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    onDone();
  }

  return (
    <Modal title="Report this comment" onClose={onClose}>
      <form onSubmit={submit}>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Reports go to the editors. Nothing is removed automatically, and
          disagreement alone is not a reason to report.
        </p>
        <fieldset className="mt-4 space-y-2">
          <legend className="sr-only">Reason</legend>
          {REPORT_REASONS.map((r) => (
            <label key={r.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="report-reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className="accent-[var(--accent)]"
              />
              {r.label}
            </label>
          ))}
        </fieldset>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Add a note (optional)
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, COMMENT_LIMITS.noteMax))}
            rows={3}
            className={fieldCls}
          />
          <span className="mt-1 block text-right text-[11px] font-normal normal-case tabular-nums">
            {note.length}/{COMMENT_LIMITS.noteMax}
          </span>
        </label>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={dialogBtn.cancel}>
            Cancel
          </button>
          <button type="submit" disabled={!reason || busy} className={dialogBtn.primary}>
            {busy ? "Sending…" : "Send report"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function RemoveDialog({
  commentId,
  onClose,
  onDone,
}: {
  commentId: string;
  onClose: () => void;
  onDone: (item: CommentData) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 3) return;
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.rpc("moderate_comment", {
      p_comment_id: commentId,
      p_action: "remove",
      p_reason: reason.trim(),
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    onDone(data as CommentData);
  }

  return (
    <Modal title="Remove this comment" onClose={onClose}>
      <form onSubmit={submit}>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          The text is hidden and replaced with a notice showing your reason.
          It is kept in the moderation log and can be restored.
        </p>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Reason (shown publicly)
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 140))}
            placeholder="e.g. Harassment of another reader"
            className={fieldCls}
            autoFocus
          />
        </label>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={dialogBtn.cancel}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={reason.trim().length < 3 || busy}
            className={dialogBtn.danger}
          >
            {busy ? "Removing…" : "Remove comment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function SuspendDialog({
  userId,
  userName,
  commentId,
  onClose,
  onDone,
}: {
  userId: string;
  userName: string;
  commentId?: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [duration, setDuration] = useState<SuspendDuration>("7d");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 3) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc("suspend_commenter", {
      p_user_id: userId,
      p_duration: duration,
      p_reason: reason.trim(),
      p_comment_id: commentId ?? null,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    onDone();
  }

  return (
    <Modal title={`Suspend ${userName}?`} onClose={onClose}>
      <form onSubmit={submit}>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          They can still read and sign in, but cannot post comments or replies.
          Their existing comments are not removed. You can lift this at any
          time from the Suspensions tab.
        </p>
        <fieldset className="mt-4 space-y-2">
          <legend className="sr-only">Length</legend>
          {SUSPEND_OPTIONS.map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="suspend-duration"
                value={o.value}
                checked={duration === o.value}
                onChange={() => setDuration(o.value)}
                className="accent-[var(--accent)]"
              />
              {o.label}
            </label>
          ))}
        </fieldset>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Reason (logged, shown only to editors)
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 300))}
            rows={3}
            className={fieldCls}
          />
        </label>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className={dialogBtn.cancel}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={reason.trim().length < 3 || busy}
            className={dialogBtn.danger}
          >
            {busy ? "Suspending…" : "Suspend"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function DeleteDialog({
  commentId,
  onClose,
  onDone,
}: {
  commentId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc("delete_own_comment", {
      p_comment_id: commentId,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    onDone();
  }

  return (
    <Modal title="Delete your comment?" onClose={onClose}>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        It disappears from the discussion. If people have replied, a
        &ldquo;Deleted by author&rdquo; note stays so the thread still reads.
      </p>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className={dialogBtn.cancel}>
          Keep it
        </button>
        <button type="button" onClick={confirm} disabled={busy} className={dialogBtn.danger}>
          {busy ? "Deleting…" : "Delete"}
        </button>
      </div>
    </Modal>
  );
}
