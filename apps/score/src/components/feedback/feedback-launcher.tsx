"use client";

import { useState } from "react";
import { MessageSquarePlus, X } from "lucide-react";
import type { ScoreFeedbackCategory } from "@/lib/types/database";

export function FeedbackLauncher({ matchId }: { matchId?: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ScoreFeedbackCategory>("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message,
          contact_email: email.trim() || null,
          match_id: matchId ?? null,
          page_path: typeof window !== "undefined" ? window.location.pathname : null,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not send feedback");
        return;
      }
      setDone(true);
      setMessage("");
      setEmail("");
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setDone(false);
          setError("");
        }}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-rule bg-white px-4 py-2.5 font-display text-sm font-bold text-accent shadow-lg transition hover:bg-surface"
        aria-label="Send feedback"
      >
        <MessageSquarePlus className="h-4 w-4" />
        Feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-extrabold">Send feedback</h3>
                <p className="text-xs text-accent/60">Bugs, ideas, or anything off on AU Score.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-accent/60 hover:bg-surface"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {done ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-emerald-700">Thanks — we got it.</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-filled w-full rounded-lg px-4 py-2 text-sm font-bold"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm">
                  <span className="font-semibold">Type</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ScoreFeedbackCategory)}
                  >
                    <option value="bug">Bug</option>
                    <option value="idea">Idea</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="font-semibold">Message</span>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="What happened / what would help?"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-semibold">Email (optional)</span>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="If you want a reply"
                  />
                </label>
                <button
                  type="button"
                  disabled={busy || message.trim().length < 3}
                  onClick={() => void submit()}
                  className="btn-filled w-full rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-40"
                >
                  {busy ? "Sending…" : "Send"}
                </button>
                {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
