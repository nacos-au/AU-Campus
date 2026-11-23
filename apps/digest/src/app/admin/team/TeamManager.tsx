"use client";

import { PageHeader, btn, input } from "@/components/admin/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS, ROLE_SUMMARIES } from "@/lib/roles";
import type { Profile, Role } from "@/lib/types";
import { deleteMemberAction } from "./actions";

const ASSIGNABLE: Role[] = ["reader", "writer", "editor", "admin"];

type TeamRow = Profile & { email?: string | null };

function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
      aria-hidden
    />
  );
}

export function TeamManager({
  currentUserId,
  isSuperAdmin = false,
}: {
  currentUserId: string;
  isSuperAdmin?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [pendingRoleId, setPendingRoleId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!success) return;
    const t = window.setTimeout(() => setSuccess(null), 2500);
    return () => window.clearTimeout(t);
  }, [success]);

  const { data: people = [], isLoading } = useQuery({
    queryKey: ["admin-team"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, username, email, role, is_super_admin, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as TeamRow[];
    },
  });

  const setRole = useMutation({
    mutationFn: async (vars: { id: string; role: Role; label: string }) => {
      setPendingRoleId(vars.id);
      const { error } = await supabase
        .from("profiles")
        .update({ role: vars.role })
        .eq("id", vars.id);
      if (error) throw error;
      return vars;
    },
    onSuccess: (vars) => {
      setError(null);
      setSuccess(`${vars.label} → ${ROLE_LABELS[vars.role]}`);
      queryClient.invalidateQueries({ queryKey: ["admin-team"] });
    },
    onError: (e: Error) => {
      setSuccess(null);
      setError(e.message);
    },
    onSettled: () => setPendingRoleId(null),
  });

  const remove = useMutation({
    mutationFn: async (vars: { id: string; label: string }) => {
      setPendingDeleteId(vars.id);
      const res = await deleteMemberAction(vars.id);
      if (!res.ok) throw new Error(res.error);
      return vars;
    },
    onSuccess: (vars) => {
      setError(null);
      setSuccess(`Removed ${vars.label}`);
      queryClient.invalidateQueries({ queryKey: ["admin-team"] });
    },
    onError: (e: Error) => {
      setSuccess(null);
      setError(e.message);
    },
    onSettled: () => setPendingDeleteId(null),
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

  return (
    <div>
      <PageHeader
        title="Team"
        description="Search by email or username, promote roles, or permanently remove a member. You cannot delete yourself."
      />

      <div className="grid gap-3 border border-rule bg-gray-50/60 p-4 text-sm sm:grid-cols-2">
        {(Object.keys(ROLE_SUMMARIES) as Role[]).map((role) => (
          <div key={role}>
            <p className="text-xs font-bold uppercase tracking-wider">
              {ROLE_LABELS[role]}
            </p>
            <p className="mt-1 text-ink-soft">{ROLE_SUMMARIES[role]}</p>
          </div>
        ))}
      </div>

      <label className="mt-6 block">
        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
          Search team
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Email, @username, or name…"
          className={input}
        />
      </label>

      {(error || success || setRole.isPending || remove.isPending) && (
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
          {(setRole.isPending || remove.isPending) && !error && !success && (
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
          Loading team…
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-8 py-8 text-center text-sm text-ink-soft">
          {needle ? `No one matches “${q.trim()}”.` : "No profiles yet."}
        </p>
      ) : (
        <div className="mt-6 divide-y divide-rule">
          {filtered.map((p) => {
            const isSelf = p.id === currentUserId;
            const canDelete =
              !isSelf && (!p.is_super_admin || isSuperAdmin);
            const roleBusy = pendingRoleId === p.id;
            const deleteBusy = pendingDeleteId === p.id;
            const label = p.display_name || p.username || p.email || "Member";
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
                    {p.is_super_admin && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-accent">
                        super admin
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-soft">
                    {p.username ? `@${p.username}` : "no username"}
                    {p.email ? ` · ${p.email}` : ""}
                  </p>
                  <p className="text-[11px] text-ink-soft/80">
                    Joined {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <select
                      value={p.role}
                      disabled={
                        (isSelf && !isSuperAdmin) || setRole.isPending
                      }
                      onChange={(e) =>
                        setRole.mutate({
                          id: p.id,
                          role: e.target.value as Role,
                          label,
                        })
                      }
                      className="border border-rule-dark px-3 py-1.5 pr-8 text-sm disabled:opacity-50"
                      title={
                        isSelf && !isSuperAdmin
                          ? "You cannot change your own role"
                          : isSelf
                            ? "Set your desk role for testing (Admin Mode elevates to admin)"
                            : "Change this person's role"
                      }
                    >
                      {ASSIGNABLE.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                    {roleBusy && (
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-soft">
                        <Spinner />
                      </span>
                    )}
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      disabled={remove.isPending}
                      className={`${btn.danger} inline-flex items-center gap-1.5`}
                      onClick={async () => {
                        if (
                          !(await confirm({
                            title: `Delete ${label}?`,
                            body: "This permanently removes their account and sign-in. Their published bylines may become anonymous. This cannot be undone.",
                            confirmLabel: "Delete member",
                            danger: true,
                          }))
                        )
                          return;
                        remove.mutate({ id: p.id, label });
                      }}
                    >
                      {deleteBusy && <Spinner />}
                      {deleteBusy ? "Deleting…" : "Delete"}
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
