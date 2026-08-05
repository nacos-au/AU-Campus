"use client";

import { useActionState } from "react";
import {
  updateScoreDisplayName,
  type ProfileSettingsState,
} from "../actions";

export function ScoreProfileSettingsForm({
  displayName,
  email,
}: {
  displayName: string;
  email: string;
}) {
  const [state, formAction, pending] = useActionState<ProfileSettingsState, FormData>(
    updateScoreDisplayName,
    null
  );

  return (
    <form action={formAction} className="mt-8 max-w-md space-y-5">
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide opacity-60">
          Display name
        </span>
        <input
          name="display_name"
          defaultValue={displayName}
          required
          maxLength={80}
          autoComplete="name"
          className="mt-1 w-full border border-rule px-4 py-3 focus:border-accent focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide opacity-60">
          Email
        </span>
        <input
          value={email}
          disabled
          className="mt-1 w-full border border-rule bg-surface px-4 py-3 opacity-70"
        />
        <span className="mt-1 block text-xs opacity-60">
          Email is shared with AU Digest and cannot be changed here.
        </span>
      </label>

      {state?.error && (
        <p className="border border-accent/30 bg-[#faf9fa] px-3 py-2 text-sm text-accent">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="border border-rule bg-surface px-3 py-2 text-sm font-semibold text-accent">
          Profile updated.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-primary px-5 py-2.5 font-display text-sm font-bold disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
