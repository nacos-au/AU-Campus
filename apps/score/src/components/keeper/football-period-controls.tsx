"use client";

import { cn } from "@/lib/utils/cn";

const BASE_PERIODS = [
  { id: "half_1", label: "1st" },
  { id: "half_time", label: "HT" },
  { id: "half_2", label: "2nd" },
  { id: "full_time", label: "FT" },
] as const;

const ET_PERIODS = [
  { id: "extra_time_1", label: "ET1" },
  { id: "extra_time_2", label: "ET2" },
] as const;

const PEN_PERIOD = { id: "penalty_shootout", label: "Pens" } as const;

export function FootballPeriodControls({
  period,
  allowsExtraTime,
  allowsPenaltyShootout,
  disabled,
  onSelect,
}: {
  period: string;
  allowsExtraTime?: boolean;
  allowsPenaltyShootout?: boolean;
  disabled?: boolean;
  onSelect: (period: string) => void;
}) {
  const periods = [
    ...BASE_PERIODS,
    ...(allowsExtraTime ? ET_PERIODS : []),
    ...(allowsPenaltyShootout ? [PEN_PERIOD] : []),
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {periods.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(p.id)}
          className={cn(
            "rounded-full px-2.5 py-1 font-display text-[11px] font-bold",
            period === p.id ? "btn-filled" : "border border-rule bg-white text-accent/70",
            disabled && "opacity-40"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
