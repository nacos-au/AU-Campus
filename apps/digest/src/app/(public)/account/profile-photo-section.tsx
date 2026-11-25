"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadProfileAvatar } from "@/lib/uploads";
import { updateAvatarUrl } from "./actions";
import { AvatarEditorModal } from "@/components/AvatarEditorModal";
import { ProfileAvatar } from "@/components/ProfileAvatar";

export function ProfilePhotoSection({
  userId,
  displayName,
  avatarUrl,
}: {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [url, setUrl] = useState(avatarUrl);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(file: File) {
    setError(null);
    setMessage(null);
    const publicUrl = await uploadProfileAvatar(supabase, userId, file);
    const result = await updateAvatarUrl(publicUrl);
    if (result?.error) throw new Error(result.error);
    setUrl(publicUrl);
    setMessage("Photo saved.");
  }

  async function remove() {
    setError(null);
    setMessage(null);
    const result = await updateAvatarUrl(null);
    if (result?.error) throw new Error(result.error);
    setUrl(null);
    setMessage("Photo removed.");
  }

  return (
    <div className="mt-8 max-w-md border-b border-rule pb-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Profile photo
      </p>
      <p className="mt-1 text-[12px] text-ink-soft">
        Shown as a small circle on your author page and account menu — not in
        full view. PNG, JPEG, or WebP; large photos are fine.
      </p>
      <div className="mt-4 flex items-center gap-4">
        <ProfileAvatar url={url} name={displayName} size="lg" />
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setOpen(true);
            }}
            className="bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-wider text-paper hover:bg-accent"
          >
            {url ? "Change photo" : "Add photo"}
          </button>
        </div>
      </div>
      {error && (
        <p className="mt-3 border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-3 border border-rule-dark bg-paper px-3 py-2 text-sm text-ink">
          {message}
        </p>
      )}
      <AvatarEditorModal
        open={open}
        onClose={() => setOpen(false)}
        hasAvatar={Boolean(url)}
        onSave={async (file) => {
          try {
            await save(file);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not save photo.");
            throw e;
          }
        }}
        onRemove={
          url
            ? async () => {
                try {
                  await remove();
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Could not remove photo."
                  );
                  throw e;
                }
              }
            : undefined
        }
      />
    </div>
  );
}
