"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import {
  AVATAR_ACCEPT,
  exportAvatarCrop,
  validateAvatarSource,
} from "@/lib/avatar-image";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
  hasAvatar: boolean;
};

export function AvatarEditorModal({
  open,
  onClose,
  onSave,
  onRemove,
  hasAvatar,
}: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = useCallback(() => {
    if (src) URL.revokeObjectURL(src);
    setSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    setError(null);
    setHint(null);
    setBusy(false);
  }, [src]);

  function handleClose() {
    reset();
    onClose();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const err = validateAvatarSource(file);
    if (err) {
      setError(err);
      return;
    }
    if (src) URL.revokeObjectURL(src);
    setError(null);
    setHint(null);
    setSrc(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  async function handleSave() {
    if (!src || !croppedArea) {
      setError("Choose a photo and adjust the crop first.");
      return;
    }
    setBusy(true);
    setError(null);
    setHint(null);
    try {
      const result = await exportAvatarCrop(src, croppedArea);
      await onSave(result.file);
      if (result.qualityReduced) {
        setHint("Optimized for the web — looks the same on your profile.");
      }
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save photo.");
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!onRemove) return;
    setBusy(true);
    setError(null);
    try {
      await onRemove();
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove photo.");
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-labelledby="avatar-editor-title"
        className="max-h-[92vh] w-full max-w-md overflow-y-auto border border-rule-dark bg-paper p-5 shadow-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="avatar-editor-title"
              className="font-serif text-xl font-bold"
            >
              Profile photo
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              PNG, JPEG, or WebP. Large photos are fine — we&apos;ll crop and
              optimize for your profile.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-ink-soft hover:text-ink"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {!src ? (
          <div className="mt-5 space-y-3">
            <label className="flex cursor-pointer flex-col items-center justify-center border border-dashed border-rule-dark px-4 py-10 text-center hover:border-ink">
              <span className="text-sm font-semibold">Choose a photo</span>
              <span className="mt-1 text-[12px] text-ink-soft">
                A clear head-and-shoulders shot works best.
              </span>
              <input
                type="file"
                accept={AVATAR_ACCEPT}
                className="sr-only"
                onChange={onFileChange}
              />
            </label>
            {hasAvatar && onRemove && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRemove()}
                className="w-full border border-rule-dark px-3 py-2 text-xs font-semibold uppercase tracking-wider text-red-700 hover:border-red-700 disabled:opacity-50"
              >
                Remove current photo
              </button>
            )}
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="relative h-64 w-full overflow-hidden bg-ink/90">
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                Zoom
              </span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="mt-1 w-full"
              />
            </label>
            <p className="text-[12px] text-ink-soft">
              Drag to reposition. Save when the circle looks right.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSave()}
                className="bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-wider text-paper hover:bg-accent disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save photo"}
              </button>
              <label className="cursor-pointer border border-ink px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-ink hover:text-paper">
                Different photo
                <input
                  type="file"
                  accept={AVATAR_ACCEPT}
                  className="sr-only"
                  onChange={onFileChange}
                />
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (src) URL.revokeObjectURL(src);
                  setSrc(null);
                  setError(null);
                }}
                className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ink-soft hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent">
            {error}
          </p>
        )}
        {hint && (
          <p className="mt-4 border border-rule bg-gray-50 px-3 py-2 text-sm text-ink-soft">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
