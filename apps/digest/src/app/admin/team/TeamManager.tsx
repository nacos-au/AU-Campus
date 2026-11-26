"use client";

import { PageHeader } from "@/components/admin/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { IconMoreHorizontal } from "@/components/icons";
import { useDismiss } from "@/components/comments/useDismiss";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS, ROLE_RANK, ROLE_SUMMARIES } from "@/lib/roles";
import type { Profile, Role } from "@/lib/types";
import { deleteMemberAction } from "./actions";

const ASSIGNABLE: Role[] = ["reader", "writer", "editor", "admin"];

type TeamRow = Profile & { email?: string | null };
type StoryCount = { total: number; live: number };
type SortKey = "member" | "role" | "stories" | "joined";

const ROLE_PILL: Record<Role, string> = {
  admin: "bg-accent-soft text-accent",
  editor: "bg-amber-50 text-amber-800",
  writer: "bg-sky-50 text-sky-800",
  reader: "bg-gray-100 text-gray-700",
};

function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
      aria-hidden
    />
  );
}

function Avatar({ person }: { person: TeamRow }) {
  const initial = (person.display_name || person.username || person.email || "?")
    .trim()
    .charAt(0)
    .toUpperCase();
  if (person.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={person.avatar_url}
        alt=""
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-ink-soft">
      {initial}
    </span>
  );
}

function RowMenu({
  email,
  canDelete,
  deleting,
  onDelete,
  onCopied,
}: {
  email?: string | null;
  canDelete: boolean;
  deleting: boolean;
  onDelete: () => void;
  onCopied: (msg: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);
  if (!email && !canDelete) return null;
  const item = "block w-full px-4 py-2 text-left text-sm hover:bg-accent-soft";
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Member actions"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-gray-100 hover:text-ink"
        onClick={() => setOpen((v) => !v)}
      >
        {deleting ? <Spinner /> : <IconMoreHorizontal className="h-4 w-4" />}
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-44 border border-rule bg-paper py-1 shadow-lg">
          {email ? (
            <button
              type="button"
              className={item}
              onClick={async () => {
                close();
                try {
                  await navigator.clipboard.writeText(email);
                  onCopied("Email copied");
                } catch {
                  onCopied(email);
                }
              }}
            >
              Copy email
            </button>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              className={`${item} text-red-700`}
              onClick={() => {
                close();
                onDelete();
              }}
            >
              Delete member
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SortHeader({
  label,
  k,
  sort,
  onSort,
  className = "",
}: {
  label: string;
  k: SortKey;
  sort: { key: SortKey; dir: 1 | -1 };
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = sort.key === k;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
      className={`px-4 py-3 text-left font-semibold ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-ink ${
          active ? "text-ink" : ""
        }`}
      >
        {label}
        <span aria-hidden className="text-[9px]">
          {active ? (sort.dir === 1 ? "▲" : "▼") : ""}
        </span>
      </button>
    </th>
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
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "joined",
    dir: -1,
  });
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
        .select(
          "id, display_name, username, email, avatar_url, role, is_super_admin, created_at"
        )
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as TeamRow[];
    },
  });

  // Story counts are a nice-to-have: if the query fails the column shows "—".
  const { data: stories } = useQuery({
    queryKey: ["admin-team-story-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("author_id, status");
      if (error) throw error;
      const map = new Map<string, StoryCount>();
      for (const a of (data ?? []) as { author_id: string; status: string }[]) {
        const c = map.get(a.author_id) ?? { total: 0, live: 0 };
        c.total += 1;
        if (a.status === "published") c.live += 1;
        map.set(a.author_id, c);
      }
      return map;
    },
  });

  const setRole = useMutation({
    mutationFn: async (vars: { id: string; role: Role; label: string }) => {
      setPendingRoleId(vars.id);
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

  const counts = useMemo(() => {
    const c: Record<Role | "all", number> = {
      all: people.length,
      admin: 0,
      editor: 0,
      writer: 0,
      reader: 0,
    };
    for (const p of people) c[p.role] = (c[p.role] ?? 0) + 1;
    return c;
  }, [people]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = people.filter((p) => {
      if (roleFilter !== "all" && p.role !== roleFilter) return false;
      if (!needle) return true;
      return [p.display_name, p.username, p.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
    const name = (p: TeamRow) =>
      (p.display_name || p.username || p.email || "").toLowerCase();
    const cmp: Record<SortKey, (a: TeamRow, b: TeamRow) => number> = {
      member: (a, b) => name(a).localeCompare(name(b)),
      role: (a, b) => ROLE_RANK[a.role] - ROLE_RANK[b.role] || name(a).localeCompare(name(b)),
      stories: (a, b) =>
        (stories?.get(a.id)?.total ?? 0) - (stories?.get(b.id)?.total ?? 0),
      joined: (a, b) => a.created_at.localeCompare(b.created_at),
    };
    return [...list].sort((a, b) => cmp[sort.key](a, b) * sort.dir);
  }, [people, q, roleFilter, sort, stories]);

  function onSort(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 1 ? -1 : 1 }
        : { key, dir: key === "member" ? 1 : -1 }
    );
  }

  const filters: (Role | "all")[] = ["all", "admin", "editor", "writer", "reader"];

  return (
    <div>
      <PageHeader
        title="Team"
        description={`${people.length} ${people.length === 1 ? "person" : "people"} in the newsroom. Change roles inline; remove members from the row menu.`}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Filter by role"
          className="flex flex-wrap gap-1.5"
        >
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={roleFilter === f}
              onClick={() => setRoleFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                roleFilter === f
                  ? "bg-ink text-paper"
                  : "bg-gray-100 text-ink-soft hover:bg-gray-200 hover:text-ink"
              }`}
            >
              {f === "all" ? "All" : `${ROLE_LABELS[f]}s`}
              <span className="ml-1.5 tabular-nums opacity-70">{counts[f]}</span>
            </button>
          ))}
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, @username or email…"
          aria-label="Search team"
          className="w-full rounded-full border border-rule-dark bg-paper px-4 py-2 text-sm placeholder:text-ink-soft/60 focus:border-ink focus:outline-none sm:w-72"
        />
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs font-semibold text-ink-soft hover:text-ink">
          What each role can do
        </summary>
        <dl className="mt-2 grid gap-3 border border-rule bg-gray-50/60 p-4 sm:grid-cols-2">
          {(Object.keys(ROLE_SUMMARIES) as Role[]).map((role) => (
            <div key={role}>
              <dt className="text-xs font-bold uppercase tracking-wider">
                {ROLE_LABELS[role]}
              </dt>
              <dd className="mt-1 text-ink-soft">{ROLE_SUMMARIES[role]}</dd>
            </div>
          ))}
        </dl>
      </details>

      {(error || success) && (
        <div
          className={`mt-4 border px-3 py-2 text-sm ${
            error
              ? "border-accent/30 bg-accent-soft text-accent"
              : "border-green-200 bg-green-50 text-green-800"
          }`}
          role="status"
          aria-live="polite"
        >
          {error ?? success}
        </div>
      )}

      <div className="mt-4 overflow-x-auto border border-rule bg-paper">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-rule text-[10px] text-ink-soft">
            <tr>
              <SortHeader label="Member" k="member" sort={sort} onSort={onSort} />
              <th scope="col" className="hidden px-4 py-3 text-left font-semibold uppercase tracking-wider lg:table-cell">
                Username
              </th>
              <SortHeader label="Role" k="role" sort={sort} onSort={onSort} />
              <SortHeader
                label="Stories"
                k="stories"
                sort={sort}
                onSort={onSort}
                className="hidden md:table-cell"
              />
              <SortHeader label="Joined" k="joined" sort={sort} onSort={onSort} />
              <th scope="col" className="w-12 px-2 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-ink-soft">
                  <span className="inline-flex items-center gap-2">
                    <Spinner /> Loading team…
                  </span>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-ink-soft">
                  {q.trim() ? `No one matches “${q.trim()}”.` : "No one with this role yet."}
                </td>
              </tr>
            ) : (
              rows.map((p) => {
                const isSelf = p.id === currentUserId;
                const canDelete = !isSelf && (!p.is_super_admin || isSuperAdmin);
                const roleLocked = (isSelf && !isSuperAdmin) || setRole.isPending;
                const label = p.display_name || p.username || p.email || "Member";
                const count = stories?.get(p.id);
                return (
                  <tr key={p.id} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar person={p} />
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-x-2 font-semibold leading-tight">
                            <span className="truncate">{p.display_name || "Unnamed"}</span>
                            {isSelf ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                                You
                              </span>
                            ) : null}
                            {p.is_super_admin ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                                Super admin
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-0.5 max-w-[16rem] truncate text-xs text-ink-soft">
                            {p.email || "No email"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-ink-soft lg:table-cell">
                      {p.username ? `@${p.username}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative inline-flex items-center">
                        <select
                          aria-label={`Role for ${label}`}
                          value={p.role}
                          disabled={roleLocked}
                          onChange={(e) =>
                            setRole.mutate({ id: p.id, role: e.target.value as Role, label })
                          }
                          className={`appearance-none rounded-full py-1 pl-3 pr-7 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${ROLE_PILL[p.role]}`}
                          title={
                            isSelf && !isSuperAdmin
                              ? "You cannot change your own role"
                              : "Change this person's role"
                          }
                        >
                          {ASSIGNABLE.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-2.5 text-[9px]" aria-hidden>
                          {pendingRoleId === p.id ? <Spinner className="h-3 w-3" /> : "▾"}
                        </span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 tabular-nums md:table-cell">
                      {count ? (
                        <span>
                          {count.live}
                          <span className="text-ink-soft"> live · {count.total} total</span>
                        </span>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-soft">
                      {new Date(p.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <RowMenu
                        email={p.email}
                        canDelete={canDelete}
                        deleting={pendingDeleteId === p.id}
                        onCopied={setSuccess}
                        onDelete={async () => {
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
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {!isLoading && rows.length > 0 ? (
        <p className="mt-2 text-xs text-ink-soft">
          Showing {rows.length} of {people.length}
        </p>
      ) : null}
    </div>
  );
}
