"use client";

import Link from "next/link";
import { X } from "lucide-react";

export function SignInModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-accent/50 hover:text-accent"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>
        <h3 className="font-display text-lg font-extrabold text-accent">Sign in to continue</h3>
        <p className="mt-2 text-sm opacity-70">
          Create an account or sign in to cast your vote and save your picks across devices.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/auth/login"
            className="btn-primary rounded-full py-3 text-center font-display text-sm font-bold"
            onClick={onClose}
          >
            Sign in
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full py-3 font-display text-sm font-semibold text-accent/70 hover:bg-surface"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
