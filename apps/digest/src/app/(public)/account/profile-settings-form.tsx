"use client";

import { useActionState } from "react";
import {
  updateDisplayName,
  type ProfileSettingsState,
} from "./actions";
import type { DeskCredit } from "@/lib/types";
import { USERNAME_HINT, USERNAME_MAX } from "@/lib/username";

export function ProfileSettingsForm({
  displayName,
  username,
  email,
  bio,
  deskCredit,
  showDeskCredit = false,
}: {
  displayName: string;
  username: string;
  email: string;
  bio: string;
  deskCredit: DeskCredit;
  showDeskCredit?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ProfileSettingsState, FormData>(
    updateDisplayName,
    null
  );

  return (
    <form action={formAction} className="mt-8 max-w-md space-y-5">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Display name
        </span>
        <input
          name="display_name"
          defaultValue={displayName}
          required
          maxLength={80}
          autoComplete="name"
          className="mt-1 w-full border border-rule-dark px-3 py-2.5 text-sm focus:border-ink focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Username
        </span>
        <div className="relative mt-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-soft">
            @
          </span>
          <input
            name="username"
            defaultValue={username}
            required
            spellCheck={false}
            autoComplete="username"
            minLength={3}
            maxLength={USERNAME_MAX}
            className="w-full border border-rule-dark py-2.5 pl-7 pr-3 text-sm focus:border-ink focus:outline-none"
          />
        </div>
        <span className="mt-1 block text-[12px] text-ink-soft">{USERNAME_HINT}</span>
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Bio
        </span>
        <textarea
          name="bio"
          defaultValue={bio}
          maxLength={500}
          rows={4}
          className="mt-1 w-full border border-rule-dark px-3 py-2.5 text-sm focus:border-ink focus:outline-none"
        />
        <span className="mt-1 block text-[12px] text-ink-soft">
          Shown on your public author page.
        </span>
      </label>

      {showDeskCredit && (
        <fieldset className="block">
          <legend className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Public credit
          </legend>
          <p className="mt-1 text-[12px] text-ink-soft">
            Shown under your name on articles. Admin Mode does not change this.
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {(
              [
                { value: "writer", label: "Writer at AUSA Digest" },
                { value: "editor", label: "Editor at AUSA Digest" },
              ] as const
            ).map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 text-sm text-ink"
              >
                <input
                  type="radio"
                  name="desk_credit"
                  value={opt.value}
                  defaultChecked={deskCredit === opt.value}
                  className="accent-ink"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Email
        </span>
        <input
          value={email}
          disabled
          className="mt-1 w-full border border-rule bg-[#fafafa] px-3 py-2.5 text-sm text-ink-soft"
        />
        <span className="mt-1 block text-[12px] text-ink-soft">
          Email is managed by your campus login and cannot be changed here.
        </span>
      </label>

      {state?.error && (
        <p className="border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="border border-rule-dark bg-paper px-3 py-2 text-sm text-ink">
          Profile updated.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-paper hover:bg-accent transition-colors disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
