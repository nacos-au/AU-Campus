"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { digestFeatures } from "@/lib/features";

type ShareMode = "live" | "snapshot";

interface ActiveLink {
  id: string;
  token: string;
  mode: ShareMode;
  created_at: string;
  snapshot: { captured_at?: string } | null;
}

interface ClaimRow {
  user_id: string;
  created_at: string;
  link_id: string;
  profiles: { display_name: string; username: string | null } | null;
}

export function ShareDraftPanel({
  articleId,
  userId,
  open,
  onClose,
}: {
  articleId: string;
  userId: string;
  open: boolean;
  onClose: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const qc = useQueryClient();
  const [mode, setMode] = useState<ShareMode>("live");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const linkQuery = useQuery({
    queryKey: ["article-share-link", articleId],
    enabled: open && digestFeatures.draftShare,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("article_share_links")
        .select("id, token, mode, created_at, snapshot")
        .eq("article_id", articleId)
        .is("revoked_at", null)
        .maybeSingle();
      if (error) throw error;
      return data as ActiveLink | null;
    },
  });

  const claimsQuery = useQuery({
    queryKey: ["article-share-claims", articleId],
    enabled: open && digestFeatures.draftShare,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("article_share_claims")
        .select(
          "user_id, created_at, link_id, profiles(display_name, username)"
        )
        .eq("article_id", articleId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ClaimRow[];
    },
  });

  const createLink = useMutation({
    mutationFn: async (m: ShareMode) => {
      const { data, error } = await supabase.rpc("create_article_share_link", {
        p_article_id: articleId,
        p_mode: m,
      });
      if (error) throw error;
      return data as { token: string; mode: ShareMode };
    },
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ["article-share-link", articleId] });
      qc.invalidateQueries({ queryKey: ["article-share-claims", articleId] });
    },
    onError: (e: Error) => {
      const msg = e.message || "Could not create share link";
      const missingRpc =
        /could not find the function/i.test(msg) ||
        /schema cache/i.test(msg);
      setError(
        missingRpc
          ? "Sharing is unavailable until the database update is applied."
          : msg
      );
    },
  });

  const rotateLink = useMutation({
    mutationFn: async () => {
      const { error: revErr } = await supabase.rpc("revoke_article_share_link", {
        p_article_id: articleId,
      });
      if (revErr) throw revErr;
      const { data, error } = await supabase.rpc("create_article_share_link", {
        p_article_id: articleId,
        p_mode: mode,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ["article-share-link", articleId] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const revokeClaim = useMutation({
    mutationFn: async (claimUserId: string) => {
      const { error } = await supabase.rpc("revoke_article_share_claim", {
        p_article_id: articleId,
        p_user_id: claimUserId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["article-share-claims", articleId] });
    },
    onError: (e: Error) => setError(e.message),
  });

  if (!open || !digestFeatures.draftShare) return null;

  const active = linkQuery.data;
  const shareUrl =
    typeof window !== "undefined" && active?.token
      ? `${window.location.origin}/share/a/${active.token}`
      : "";

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy — select the link and copy manually.");
    }
  }

  const claims = (claimsQuery.data ?? []).filter((c) => c.user_id !== userId);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-labelledby="share-draft-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto border border-rule-dark bg-paper p-5 shadow-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="share-draft-title"
              className="font-serif text-xl font-bold"
            >
              Share draft
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Copy a private link. People with a Digest account who open it are
              listed below — view only. You can revoke anytime.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-soft hover:text-ink"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            Link mode
          </p>
          <div className="flex gap-2">
            {(
              [
                {
                  id: "live" as const,
                  label: "Live updates",
                  hint: "They see edits until revoked",
                },
                {
                  id: "snapshot" as const,
                  label: "Snapshot",
                  hint: "Frozen copy from now",
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMode(opt.id)}
                className={`flex-1 border px-3 py-2 text-left text-xs ${
                  mode === opt.id
                    ? "border-ink bg-ink text-paper"
                    : "border-rule-dark hover:border-ink"
                }`}
              >
                <span className="block font-semibold uppercase tracking-wider">
                  {opt.label}
                </span>
                <span
                  className={`mt-0.5 block ${
                    mode === opt.id ? "text-paper/80" : "text-ink-soft"
                  }`}
                >
                  {opt.hint}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {!active ? (
            <button
              type="button"
              disabled={createLink.isPending}
              onClick={() => createLink.mutate(mode)}
              className="bg-accent px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {createLink.isPending ? "Creating…" : "Create link"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void copyLink()}
                className="bg-ink px-3 py-2 text-xs font-semibold uppercase tracking-wider text-paper hover:bg-accent"
              >
                {copied ? "Copied" : "Copy link"}
              </button>
              <button
                type="button"
                disabled={rotateLink.isPending}
                onClick={() => rotateLink.mutate()}
                className="border border-ink px-3 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-ink hover:text-paper disabled:opacity-50"
              >
                {rotateLink.isPending ? "Rotating…" : "Rotate link"}
              </button>
            </>
          )}
        </div>

        {active && (
          <div className="mt-3 border border-rule bg-gray-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              Active · {active.mode === "live" ? "Live" : "Snapshot"}
              {active.mode === "snapshot" && active.snapshot?.captured_at
                ? ` · ${new Date(active.snapshot.captured_at).toLocaleString()}`
                : ""}
            </p>
            <p className="mt-1 break-all font-mono text-[11px] text-ink">
              {shareUrl || `/share/a/${active.token}`}
            </p>
          </div>
        )}

        {error && (
          <p className="mt-3 border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent">
            {error}
          </p>
        )}

        <div className="mt-5 border-t border-rule pt-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            Who has access
          </h3>
          {claimsQuery.isLoading ? (
            <p className="mt-2 text-sm text-ink-soft">Loading…</p>
          ) : claims.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">
              Nobody has opened the link yet.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-rule">
              {claims.map((c) => (
                <li
                  key={c.user_id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {c.profiles?.display_name ?? "Reader"}
                    </p>
                    <p className="text-[11px] text-ink-soft">
                      Opened {new Date(c.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={revokeClaim.isPending}
                    onClick={() => revokeClaim.mutate(c.user_id)}
                    className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-red-700 underline hover:text-red-900"
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
