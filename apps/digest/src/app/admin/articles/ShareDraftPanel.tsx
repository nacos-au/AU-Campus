"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { digestFeatures } from "@/lib/features";

type ShareMode = "live" | "snapshot";

const MAX_ACTIVE_LINKS = 20;

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

function CopyIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2m-6 12h8a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2Z" />
    </svg>
  );
}

function shareUrlFor(token: string): string {
  if (typeof window === "undefined") return `/share/a/${token}`;
  return `${window.location.origin}/share/a/${token}`;
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const linksQuery = useQuery({
    queryKey: ["article-share-links", articleId],
    enabled: open && digestFeatures.draftShare,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("article_share_links")
        .select("id, token, mode, created_at, snapshot")
        .eq("article_id", articleId)
        .is("revoked_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ActiveLink[];
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
      qc.invalidateQueries({ queryKey: ["article-share-links", articleId] });
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

  const deactivateLink = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase.rpc("deactivate_article_share_link", {
        p_link_id: linkId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ["article-share-links", articleId] });
    },
    onError: (e: Error) => {
      const msg = e.message || "Could not deactivate link";
      if (/could not find the function/i.test(msg) || /schema cache/i.test(msg)) {
        setError("Sharing is unavailable until the database update is applied.");
      } else {
        setError(msg);
      }
    },
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

  const links = linksQuery.data ?? [];
  const atCap = links.length >= MAX_ACTIVE_LINKS;
  const claims = (claimsQuery.data ?? []).filter((c) => c.user_id !== userId);

  async function copyLink(linkId: string, token: string) {
    const url = shareUrlFor(token);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(linkId);
      window.setTimeout(() => setCopiedId((id) => (id === linkId ? null : id)), 2000);
    } catch {
      setError("Could not copy — select the link and copy manually.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-labelledby="share-draft-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-rule-dark bg-paper shadow-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink px-5 py-4">
          <div>
            <h2
              id="share-draft-title"
              className="font-serif text-xl font-bold tracking-tight"
            >
              Share draft
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Private links for Digest accounts — view only. Add several; deactivate
              any one when you are done with it.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-ink-soft hover:text-ink"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-rule px-5 py-3">
          <div className="flex gap-1">
            {(
              [
                { id: "live" as const, label: "Live" },
                { id: "snapshot" as const, label: "Snapshot" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMode(opt.id)}
                className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${
                  mode === opt.id
                    ? "bg-ink text-paper"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={createLink.isPending || atCap}
            onClick={() => createLink.mutate(mode)}
            className="bg-accent px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {createLink.isPending ? "Adding…" : "Add link"}
          </button>
        </div>

        {atCap && (
          <p className="border-b border-rule px-5 py-2 text-[12px] text-ink-soft">
            Limit of {MAX_ACTIVE_LINKS} active links. Deactivate one to add another.
          </p>
        )}

        <div className="px-5">
          {linksQuery.isLoading ? (
            <p className="py-6 text-sm text-ink-soft">Loading links…</p>
          ) : links.length === 0 ? (
            <p className="py-6 text-sm text-ink-soft">
              No active links yet. Choose Live or Snapshot, then Add link.
            </p>
          ) : (
            <ul className="divide-y divide-rule">
              {links.map((link) => {
                const url = shareUrlFor(link.token);
                const copied = copiedId === link.id;
                return (
                  <li key={link.id} className="py-3">
                    <div className="flex items-stretch gap-2">
                      <button
                        type="button"
                        onClick={() => void copyLink(link.id, link.token)}
                        className="min-w-0 flex-1 text-left"
                        title="Tap to copy"
                      >
                        <span className="block break-all font-mono text-[11px] leading-snug text-ink underline-offset-2 hover:underline">
                          {url}
                        </span>
                        <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                          {link.mode === "live" ? "Live" : "Snapshot"}
                          {" · "}
                          {new Date(link.created_at).toLocaleString()}
                          {link.mode === "snapshot" && link.snapshot?.captured_at
                            ? ` · Frozen ${new Date(link.snapshot.captured_at).toLocaleString()}`
                            : ""}
                          {copied ? " · Copied" : ""}
                        </span>
                      </button>
                      <div className="flex shrink-0 flex-col items-end justify-center gap-2 border-l border-rule pl-2">
                        <button
                          type="button"
                          onClick={() => void copyLink(link.id, link.token)}
                          className="flex h-8 w-8 items-center justify-center text-ink-soft hover:text-ink"
                          aria-label={copied ? "Copied" : "Copy link"}
                          title={copied ? "Copied" : "Copy link"}
                        >
                          <CopyIcon />
                        </button>
                        <button
                          type="button"
                          disabled={deactivateLink.isPending}
                          onClick={() => deactivateLink.mutate(link.id)}
                          className="text-[10px] font-bold uppercase tracking-wider text-red-700 hover:text-red-900 disabled:opacity-50"
                        >
                          Deactivate
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error && (
          <p className="mx-5 mb-3 border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent">
            {error}
          </p>
        )}

        <div className="border-t border-ink px-5 py-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            Who has access
          </h3>
          {claimsQuery.isLoading ? (
            <p className="mt-2 text-sm text-ink-soft">Loading…</p>
          ) : claims.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">
              Nobody has opened a link yet.
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
