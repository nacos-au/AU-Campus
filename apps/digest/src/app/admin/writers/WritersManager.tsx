"use client";

import { PageHeader, btn, input } from "@/components/admin/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS } from "@/lib/roles";
import type { Profile, Role } from "@/lib/types";

type TeamRow = Profile & { email?: string | null };

function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
      aria-hidden
    />
  );
}

export function WritersManager({ currentUserId }: { currentUserId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!success) return;
    const t = window.setTimeout(() => setSuccess(null), 2500);
    return () => window.clearTimeout(t);
  }, [success]);

  const { data: people = [], isLoading } = useQuery({
    queryKey: ["admin-writers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, username, email, role, is_super_admin, created_at")
        .in("role", ["reader", "writer"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as TeamRow[];
    },
  });

  const setRole = useMutation({
    mutationFn: async (vars: { id: string; role: Role; label: string }) => {
      setPendingId(vars.id);
      const { error } = await supabase.rpc("set_newsroom_role", {
        p_user_id: vars.id,
        p_role: vars.role,
      });
      if (error) throw error;
      return vars;
    },
    onSuccess: (vars) => {
      setError(null);
      setSuccess(`${vars.label} → ${ROLE_LABELS[vars.role]}`);
      queryClient.invalidateQueries({ queryKey: ["admin-writers"] });
    },
    onError: (e: Error) => {
      setSuccess(null);
      setError(e.message);
    },
    onSettled: () => setPendingId(null),
  });

  const needle = q.trim().toLowerCase();
  const filtered = !needle
    ? people
    : people.filter((p) => {
        const hay = [p.display_name, p.username, p.email]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(needle);
      });

  const staffHit =
    needle.length > 0 &&
    filtered.length === 0 &&
    /editor|admin|@/.test(needle);

  return (
    <div>
      <PageHeader
        title="Writers"
        description="Promote readers to the newsroom desk. Editors cannot create editors or admins."
      />

      <p className="border border-rule bg-gray-50/60 px-4 py-3 text-sm text-ink-soft">
        Reader ↔ Writer only. Higher roles are managed on{" "}
        <span className="font-semibold text-ink">Team</span> by an admin.
      </p>

      <label className="mt-6 block">
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
          Search
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Email, @username, or name…"
          className={input}
        />
      </label>

      {(error || success || setRole.isPending) && (
        <div
          className={`mt-4 flex items-center gap-2 border px-3 py-2 text-sm ${
            error
              ? "border-accent/30 bg-accent-soft text-accent"
              : success
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-rule bg-gray-50 text-ink-soft"
          }`}
          role="status"
          aria-live="polite"
        >
          {setRole.isPending && !error && !success && (
            <>
              <Spinner />
              <span>Saving…</span>
            </>
          )}
          {success && !error && <span>{success}</span>}
          {error && <span>{error}</span>}
        </div>
      )}

      {isLoading ? (
        <p className="flex items-center justify-center gap-2 py-12 text-sm text-ink-soft">
          <Spinner className="text-ink-soft" />
          Loading…
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 py-8 text-center text-sm text-ink-soft">
          {needle
            ? staffHit
              ? `No reader or writer matches “${q.trim()}”. Editors and admins are managed on Team by an admin.`
              : `No reader or writer matches “${q.trim()}”.`
            : "No readers or writers yet."}
        </p>
      ) : (
        <div className="mt-6 divide-y divide-rule">
          {filtered.map((p) => {
            const isSelf = p.id === currentUserId;
            const busy = pendingId === p.id;
            const label = p.display_name || p.username || p.email || "Member";
            const isWriter = p.role === "writer";
            const nextRole: Role = isWriter ? "reader" : "writer";
            return (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold">
                    {p.display_name || "Unnamed"}
                    {isSelf && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                        you
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-soft">
                    {p.username ? `@${p.username}` : "no username"}
                    {p.email ? ` · ${p.email}` : ""}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-ink-soft/80">
                    <span className="rounded-sm bg-rule px-1.5 py-0.5 font-semibold uppercase tracking-wider text-ink-soft">
                      {ROLE_LABELS[p.role as Role] ?? p.role}
                    </span>
                    <span>Joined {new Date(p.created_at).toLocaleDateString()}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isSelf ? (
                    <span className="text-xs text-ink-soft">You can’t change your own role</span>
                  ) : (
                    <button
                      type="button"
                      disabled={setRole.isPending}
                      className={`${isWriter ? btn.secondary : btn.primary} inline-flex items-center gap-1.5`}
                      onClick={async () => {
                        if (isWriter) {
                          const ok = await confirm({
                            title: `Make ${label} a reader?`,
                            body: "They’ll lose newsroom draft access until promoted again.",
                            confirmLabel: "Make reader",
                            danger: true,
                          });
                          if (!ok) return;
                        }
                        setRole.mutate({ id: p.id, role: nextRole, label });
                      }}
                    >
                      {busy && <Spinner />}
                      {busy
                        ? "Saving…"
                        : isWriter
                          ? "Make reader"
                          : "Make writer"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
