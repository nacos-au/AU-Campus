"use client";

import { useState } from "react";
import { AuthModal } from "@/components/auth/auth-modal";

/** Lightweight gate used by voting — opens the branded centered auth modal. */
export function SignInModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <AuthModal open={open} onClose={onClose} initialMode="signin" />;
}

export function SignInPromptButton({
  label = "Sign in",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      <AuthModal open={open} onClose={() => setOpen(false)} initialMode="signin" />
    </>
  );
}
