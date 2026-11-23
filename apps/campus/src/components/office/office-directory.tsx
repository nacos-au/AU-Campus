"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  searchDirectory,
  setAppRole,
  setMemberVerification,
  setNewsroomRole,
  setSuperAdminFlag,
} from "@/app/actions/office";
import type { DirectoryUser } from "@/lib/platform-roles";
import type { AppId, AppRoleName } from "@/lib/platform-roles";

type NewsroomRole = "reader" | "writer" | "editor" | "admin";

function RoleChip({
  active,
  label,
  tone,
  onClick,
  pending,
}: {
  active: boolean;
  label: string;
  tone: "ink" | "accent" | "green" | "warn";
  onClick: () => void;
  pending: boolean;
}) {
  const tones = {
    ink: active
      ? "bg-ink text-white border-ink"
      : "bg-white text-ink border-rule hover:border-ink",
    accent: active
      ? "bg-accent text-white border-accent"
      : "bg-white text-accent border-rule hover:border-accent",
    green: active
      ? "bg-green text-white border-green"
      : "bg-white text-green border-rule hover:border-green",
    warn: active
      ? "bg-[#8a5a00] text-white border-[#8a5a00]"
      : "bg-white text-[#8a5a00] border-rule hover:border-[#8a5a00]",
  };

  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition disabled:opacity-50 ${tones[tone]}`}
    >
      {pending && (
        <span
          className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden
        />
      )}
      {label}
    </button>
  );
}

function UserRow({
  user,
  selfId,
}: {
  user: DirectoryUser;
  selfId: string;
}) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function run(key: string, work: () => Promise<{ ok?: boolean; error?: string } | null>) {
    start(async () => {
      setPendingKey(key);
      setError(null);
      setSuccess(null);
      try {
        const res = await work();
        if (res?.error) {
          setError(res.error);
        } else {
          setSuccess("Saved");
          router.refresh();
          window.setTimeout(() => setSuccess(null), 2000);
        }
      } finally {
        setPendingKey(null);
      }
    });
  }

  function toggle(app: AppId, role: AppRoleName) {
    const current = user.apps[app];
    const next = current === role ? null : role;
    const msg =
      next === null
        ? `Remove ${app} ${role} from @${user.username || user.email}?`
        : `Grant ${app} / ${role} to @${user.username || user.email}?`;
    if (!window.confirm(msg)) return;

    run(`${app}:${role}`, () => setAppRole({ userId: user.id, app, role: next }));
  }

  function setNewsroom(role: NewsroomRole) {
    if (user.id === selfId) {
      setError("You cannot change your own newsroom role here.");
      return;
    }
    const next = user.role === role ? "reader" : role;
    const msg =
      next === "reader"
        ? `Demote @${user.username || user.email} to reader?`
        : `Set newsroom role to ${role} for @${user.username || user.email}?`;
    if (!window.confirm(msg)) return;

    run(`newsroom:${role}`, () =>
      setNewsroomRole({ userId: user.id, role: next })
    );
  }

  function verifyMember() {
    if (user.verification_level === "verified") {
      const ok = window.confirm(`Revoke verification for ${user.email || user.display_name}?`);
      if (!ok) return;
      run("verify", () =>
        setMemberVerification({ userId: user.id, verified: false })
      );
      return;
    }
    const matric = window.prompt(
      "Member ID to link this account (checked in person). At least 3 characters."
    );
    if (!matric || matric.trim().length < 3) return;
    run("verify", () =>
      setMemberVerification({
        userId: user.id,
        verified: true,
        matric: matric.trim(),
      })
    );
  }

  function toggleSuper() {
    const enabled = !user.is_super_admin;
    if (enabled) {
      const ok = window.confirm(
        `Make ${user.email} a SUPER ADMIN?\n\nThey will control all platforms and can grant roles. Prefer a single owner.`
      );
      if (!ok) return;
    } else {
      const ok = window.confirm(`Remove super admin from ${user.email}?`);
      if (!ok) return;
    }
    run("super", () => setSuperAdminFlag({ userId: user.id, enabled }));
  }

  const busy = pendingKey !== null;

  return (
    <div className="border-b border-rule px-4 py-3 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold text-ink">
            {user.display_name || "Unnamed"}
            {user.id === selfId && (
              <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
                you
              </span>
            )}
          </p>
          <p className="truncate text-xs text-ink-soft">
            {user.username ? `@${user.username}` : "—"} · {user.email || "no email"}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-soft">
            {user.verification_level === "verified" ? "L2 verified" : "L1 soft"} · newsroom{" "}
            {user.role}
          </p>
        </div>
        <div className="flex min-w-0 flex-col items-end gap-2">
          <div className="flex flex-wrap justify-end gap-1.5">
            <span className="self-center text-[10px] font-bold uppercase tracking-wide text-ink-soft">
              Digest
            </span>
            <RoleChip
              active={user.role === "writer"}
              label="Writer"
              tone="accent"
              pending={pendingKey === "newsroom:writer"}
              onClick={() => setNewsroom("writer")}
            />
            <RoleChip
              active={user.role === "editor"}
              label="Editor"
              tone="accent"
              pending={pendingKey === "newsroom:editor"}
              onClick={() => setNewsroom("editor")}
            />
            <RoleChip
              active={user.role === "admin"}
              label="Admin"
              tone="accent"
              pending={pendingKey === "newsroom:admin"}
              onClick={() => setNewsroom("admin")}
            />
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            <span className="self-center text-[10px] font-bold uppercase tracking-wide text-ink-soft">
              Apps
            </span>
            <RoleChip
              active={user.apps.campus === "admin"}
              label="Campus"
              tone="ink"
              pending={pendingKey === "campus:admin"}
              onClick={() => toggle("campus", "admin")}
            />
            <RoleChip
              active={user.apps.digest === "admin"}
              label="Digest ops"
              tone="accent"
              pending={pendingKey === "digest:admin"}
              onClick={() => toggle("digest", "admin")}
            />
            <RoleChip
              active={user.apps.score === "admin"}
              label="Score"
              tone="green"
              pending={pendingKey === "score:admin"}
              onClick={() => toggle("score", "admin")}
            />
            <RoleChip
              active={user.apps.score === "record_keeper"}
              label="Keeper"
              tone="green"
              pending={pendingKey === "score:record_keeper"}
              onClick={() => toggle("score", "record_keeper")}
            />
            <RoleChip
              active={user.verification_level === "verified"}
              label={user.verification_level === "verified" ? "Verified" : "Verify"}
              tone="ink"
              pending={pendingKey === "verify"}
              onClick={verifyMember}
            />
            <RoleChip
              active={user.is_super_admin}
              label="Super"
              tone="warn"
              pending={pendingKey === "super"}
              onClick={toggleSuper}
            />
          </div>
        </div>
      </div>
      {busy && !error && !success && (
        <p className="mt-2 text-xs font-semibold text-ink-soft">Saving role…</p>
      )}
      {success && (
        <p className="mt-2 text-xs font-semibold text-green">Assigned successfully</p>
      )}
      {error && <p className="mt-2 text-xs font-semibold text-accent">{error}</p>}
    </div>
  );
}

export function OfficeDirectory({
  initialRecent,
  initialStaff,
  selfId,
}: {
  initialRecent: DirectoryUser[];
  initialStaff: DirectoryUser[];
  selfId: string;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<DirectoryUser[] | null>(null);
  const [pending, start] = useTransition();
  const [searchError, setSearchError] = useState<string | null>(null);

  function runSearch(value: string) {
    setQ(value);
    if (value.trim().length < 2) {
      setResults(null);
      setSearchError(null);
      return;
    }
    start(async () => {
      setSearchError(null);
      const rows = await searchDirectory(value);
      setResults(rows);
      if (rows.length === 0) setSearchError("No users matched.");
    });
  }

  const showing = results ?? initialRecent;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-rule bg-white/90 shadow-sm">
        <div className="border-b border-rule px-4 py-3">
          <h2 className="font-display text-sm font-extrabold text-ink">Staff roster</h2>
          <p className="text-xs text-ink-soft">
            Newsroom Writer / Editor / Admin, Score Admin / Keeper, and app ops.
          </p>
        </div>
        {initialStaff.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-soft">No staff roles yet — grant from search below.</p>
        ) : (
          initialStaff.map((u) => <UserRow key={u.id} user={u} selfId={selfId} />)
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-rule bg-white/90 shadow-sm">
        <div className="border-b border-rule px-4 py-3">
          <h2 className="font-display text-sm font-extrabold text-ink">Find & grant</h2>
          <p className="text-xs text-ink-soft">
            Search email, name, or @username — tap a chip to grant or revoke (confirm). Spinner
            shows while saving.
          </p>
          <input
            value={q}
            onChange={(e) => runSearch(e.target.value)}
            placeholder="Search users…"
            className="mt-3 w-full rounded-xl border border-rule bg-paper px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
          />
          {pending && <p className="mt-2 text-xs text-ink-soft">Searching…</p>}
          {searchError && !pending && (
            <p className="mt-2 text-xs text-ink-soft">{searchError}</p>
          )}
        </div>
        <div className="border-b border-rule bg-paper/60 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
          {results ? "Search results" : "Recent signups"}
        </div>
        {showing.map((u) => (
          <UserRow key={u.id} user={u} selfId={selfId} />
        ))}
      </section>
    </div>
  );
}
