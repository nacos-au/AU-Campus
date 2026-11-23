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

/**
 * Role model (no overlap by design):
 * - Newsroom: one profiles.role value (reader|writer|editor|admin) — radio, not toggle.
 * - Per app: one app_roles row per (user, app) — Score Admin XOR Keeper.
 * Re-clicking the active chip is a no-op so we never silently demote / lose access.
 * Demotion is explicit (Reader / confirm revoke).
 */

function RoleChip({
  active,
  label,
  tone,
  onClick,
  pending,
  disabled,
}: {
  active: boolean;
  label: string;
  tone: "ink" | "accent" | "green" | "warn";
  onClick: () => void;
  pending: boolean;
  disabled?: boolean;
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
      disabled={pending || disabled}
      aria-pressed={active}
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

  const handle = user.username ? `@${user.username}` : user.email || "user";

  function run(
    key: string,
    okMessage: string,
    work: () => Promise<{ ok?: boolean; error?: string } | null>
  ) {
    start(async () => {
      setPendingKey(key);
      setError(null);
      setSuccess(null);
      try {
        const res = await work();
        if (res?.error) {
          setError(res.error);
        } else {
          setSuccess(okMessage);
          router.refresh();
          window.setTimeout(() => setSuccess(null), 2500);
        }
      } finally {
        setPendingKey(null);
      }
    });
  }

  /** One role per app — set replaces previous; revoke only when confirmed. */
  function assignApp(app: AppId, role: AppRoleName) {
    const current = user.apps[app];
    if (current === role) return; // already set — no silent revoke

    const swap =
      current && current !== role
        ? `This replaces their current ${app} / ${current} role.\n\n`
        : "";
    if (
      !window.confirm(
        `${swap}Grant ${app} / ${role} to ${handle}?`
      )
    )
      return;

    run(`${app}:${role}`, `${app} → ${role}`, () =>
      setAppRole({ userId: user.id, app, role })
    );
  }

  function revokeApp(app: AppId) {
    const current = user.apps[app];
    if (!current) return;
    if (
      !window.confirm(
        `Remove ${app} / ${current} from ${handle}?\n\nThey will lose that app access immediately.`
      )
    )
      return;

    run(`${app}:revoke`, `${app} access removed`, () =>
      setAppRole({ userId: user.id, app, role: null })
    );
  }

  /** Exclusive newsroom ladder — one profiles.role, never overlap. */
  function assignNewsroom(role: NewsroomRole) {
    if (user.id === selfId) {
      setError("You cannot change your own newsroom role here.");
      return;
    }
    if (user.role === role) return; // already set

    const from = user.role;
    const demoting =
      role === "reader" ||
      (from === "admin" && (role === "editor" || role === "writer")) ||
      (from === "editor" && role === "writer");

    const msg = demoting
      ? `Change ${handle} from ${from} → ${role}?\n\nThey keep their account and articles; only desk permissions change.`
      : `Set newsroom role ${from} → ${role} for ${handle}?`;
    if (!window.confirm(msg)) return;

    run(`newsroom:${role}`, `Newsroom → ${role}`, () =>
      setNewsroomRole({ userId: user.id, role })
    );
  }

  function verifyMember() {
    if (user.verification_level === "verified") {
      if (
        !window.confirm(
          `Revoke verification for ${user.email || user.display_name}?`
        )
      )
        return;
      run("verify", "Verification revoked", () =>
        setMemberVerification({ userId: user.id, verified: false })
      );
      return;
    }
    const matric = window.prompt(
      "Member ID to link this account (checked in person). At least 3 characters."
    );
    if (!matric || matric.trim().length < 3) return;
    run("verify", "Verified", () =>
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
      if (
        !window.confirm(
          `Make ${user.email} a SUPER ADMIN?\n\nThey will control all platforms and can grant roles. Prefer a single owner.`
        )
      )
        return;
    } else {
      if (!window.confirm(`Remove super admin from ${user.email}?`)) return;
    }
    run("super", enabled ? "Super admin granted" : "Super admin removed", () =>
      setSuperAdminFlag({ userId: user.id, enabled })
    );
  }

  const busy = pendingKey !== null;
  const newsroom: NewsroomRole =
    user.role === "writer" || user.role === "editor" || user.role === "admin"
      ? user.role
      : "reader";

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
            {user.verification_level === "verified" ? "L2 verified" : "L1 soft"} ·
            newsroom {newsroom}
            {user.apps.score ? ` · score ${user.apps.score}` : ""}
          </p>
        </div>
        <div className="flex min-w-0 flex-col items-end gap-2">
          <div className="flex flex-wrap justify-end gap-1.5">
            <span className="self-center text-[10px] font-bold uppercase tracking-wide text-ink-soft">
              Newsroom
            </span>
            {(
              [
                ["reader", "Reader"],
                ["writer", "Writer"],
                ["editor", "Editor"],
                ["admin", "Admin"],
              ] as const
            ).map(([role, label]) => (
              <RoleChip
                key={role}
                active={newsroom === role}
                label={label}
                tone="accent"
                pending={pendingKey === `newsroom:${role}`}
                disabled={user.id === selfId}
                onClick={() => assignNewsroom(role)}
              />
            ))}
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            <span className="self-center text-[10px] font-bold uppercase tracking-wide text-ink-soft">
              Score
            </span>
            <RoleChip
              active={user.apps.score === "admin"}
              label="Admin"
              tone="green"
              pending={pendingKey === "score:admin"}
              onClick={() => assignApp("score", "admin")}
            />
            <RoleChip
              active={user.apps.score === "record_keeper"}
              label="Keeper"
              tone="green"
              pending={pendingKey === "score:record_keeper"}
              onClick={() => assignApp("score", "record_keeper")}
            />
            {user.apps.score && (
              <RoleChip
                active={false}
                label="Clear"
                tone="ink"
                pending={pendingKey === "score:revoke"}
                onClick={() => revokeApp("score")}
              />
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            <span className="self-center text-[10px] font-bold uppercase tracking-wide text-ink-soft">
              Other
            </span>
            <RoleChip
              active={user.apps.campus === "admin"}
              label="Campus"
              tone="ink"
              pending={pendingKey === "campus:admin"}
              onClick={() =>
                user.apps.campus === "admin"
                  ? revokeApp("campus")
                  : assignApp("campus", "admin")
              }
            />
            <RoleChip
              active={user.apps.digest === "admin"}
              label="Digest ops"
              tone="accent"
              pending={pendingKey === "digest:admin"}
              onClick={() =>
                user.apps.digest === "admin"
                  ? revokeApp("digest")
                  : assignApp("digest", "admin")
              }
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
        <p className="mt-2 text-xs font-semibold text-green">{success}</p>
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
            One newsroom role per person. Score is Admin <em>or</em> Keeper — never both.
            Re-clicking an active chip does nothing; use Reader / Clear to demote.
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
            Search email, name, or @username. Confirm each change — spinner while saving.
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
