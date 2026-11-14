"use client";

import { useRouter } from "next/navigation";

type WeekOption = {
  weekStart: string;
  label: string;
};

export function WeekPicker({
  label,
  options,
  value,
}: {
  label: string;
  options: WeekOption[];
  value: string;
}) {
  const router = useRouter();

  if (options.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-sm text-ink-soft">{label}</span>
      <label className="relative inline-flex items-center">
        <span className="sr-only">{label}</span>
        <select
          value={value}
          onChange={(e) => {
            const week = e.target.value;
            router.push(week ? `/weekly?week=${week}` : "/weekly");
          }}
          className="appearance-none border border-rule-dark bg-paper py-1.5 pl-3 pr-9 text-sm font-semibold text-ink focus:border-ink focus:outline-none"
        >
          {options.map((o) => (
            <option key={o.weekStart} value={o.weekStart}>
              {o.label}
            </option>
          ))}
        </select>
        <span
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-ink-soft"
          aria-hidden
        >
          ▼
        </span>
      </label>
    </div>
  );
}
