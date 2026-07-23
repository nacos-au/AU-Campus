"use client";

import { useEffect, useState } from "react";

const CITIES = [
  { label: "Lagos", tz: "Africa/Lagos" },
  { label: "Nairobi", tz: "Africa/Nairobi" },
  { label: "Cairo", tz: "Africa/Cairo" },
  { label: "London", tz: "Europe/London" },
  { label: "New York", tz: "America/New_York" },
  { label: "Tokyo", tz: "Asia/Tokyo" },
] as const;

function formatCity(tz: string, now: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tz,
  }).format(now);
}

/** Desktop utility strip (progressive city reveal). */
export function WorldClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const visibility = [
    "",
    "hidden sm:flex",
    "hidden lg:flex",
    "hidden md:flex",
    "hidden lg:flex",
    "hidden xl:flex",
  ];

  return (
    <div
      className="flex items-center divide-x divide-rule-dark"
      aria-label="World clocks"
    >
      {CITIES.map((city, i) => (
        <span
          key={city.label}
          className={`items-baseline gap-1.5 px-2.5 first:pl-0 last:pr-0 ${
            visibility[i] || "flex"
          }`}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
            {city.label}
          </span>
          <span className="text-[11px] font-semibold tabular-nums text-ink">
            {now ? formatCity(city.tz, now) : "--:--"}
          </span>
        </span>
      ))}
    </div>
  );
}

/** Stacked clocks for the mobile drawer — all cities, no noise on the bar. */
export function WorldClockStack() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-2" aria-label="World clocks">
      {CITIES.map((city) => (
        <li key={city.label} className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            {city.label}
          </span>
          <span className="text-sm font-semibold tabular-nums text-ink">
            {now ? formatCity(city.tz, now) : "--:--"}
          </span>
        </li>
      ))}
    </ul>
  );
}
