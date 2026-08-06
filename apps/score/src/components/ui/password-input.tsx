"use client";

import { useState } from "react";

type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  wrapperClassName?: string;
  /** `dark` for inverted auth shells (white text on maroon). */
  tone?: "light" | "dark";
};

export function PasswordInput({
  className = "",
  wrapperClassName = "",
  tone = "light",
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`relative ${wrapperClassName}`}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`pr-14 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className={
          tone === "dark"
            ? "absolute right-3 top-1/2 -translate-y-1/2 font-display text-[10px] font-bold uppercase tracking-wide text-white/55 hover:text-white"
            : "absolute right-3 top-1/2 -translate-y-1/2 font-display text-[10px] font-bold uppercase tracking-wide text-accent/60 hover:text-accent"
        }
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
