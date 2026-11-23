import type { WeatherCondition } from "@/lib/weather";

type Props = {
  condition: WeatherCondition;
  className?: string;
};

/** Monochrome animated weather glyphs for masthead use. */
export function WeatherIcon({ condition, className = "h-5 w-5" }: Props) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true as const,
  };

  switch (condition) {
    case "clear":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3.5" className="origin-center animate-[spin_24s_linear_infinite]" />
          <g className="origin-center animate-pulse">
            <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M5.1 18.9l1.6-1.6M17.3 6.7l1.6-1.6" />
          </g>
        </svg>
      );
    case "partly":
      return (
        <svg {...common}>
          <circle cx="9" cy="9" r="2.5" />
          <path d="M9 3.5v1.5M3.5 9H5M5.2 5.2l1.1 1.1" className="opacity-80" />
          <path d="M8 16.5h8.5a3.2 3.2 0 0 0 .2-6.4 4.4 4.4 0 0 0-8.3 1.6 2.8 2.8 0 0 0-.4 4.8Z" />
        </svg>
      );
    case "cloud":
      return (
        <svg {...common}>
          <path
            d="M7.5 17h9.2a3.4 3.4 0 0 0 .2-6.8 4.6 4.6 0 0 0-8.7 1.7A3 3 0 0 0 7.5 17Z"
            className="animate-[pulse_3.5s_ease-in-out_infinite]"
          />
        </svg>
      );
    case "fog":
      return (
        <svg {...common}>
          <path d="M4 9h16M5 12.5h14M6 16h12" className="animate-[pulse_2.8s_ease-in-out_infinite]" />
        </svg>
      );
    case "drizzle":
      return (
        <svg {...common}>
          <path d="M7.5 13.5h9.2a3.2 3.2 0 0 0 .2-6.4 4.4 4.4 0 0 0-8.4 1.6 2.8 2.8 0 0 0-1 4.8Z" />
          <path d="M9 16.5v2M12 17v2.5M15 16.5v2" className="animate-[pulse_1.6s_ease-in-out_infinite]" />
        </svg>
      );
    case "rain":
      return (
        <svg {...common}>
          <path d="M7.5 13h9.2a3.2 3.2 0 0 0 .2-6.4 4.4 4.4 0 0 0-8.4 1.6 2.8 2.8 0 0 0-1 4.8Z" />
          <path d="M9 15.5 8 19M12.5 16l-1 3.5M16 15.5l-1 3.5" className="animate-[pulse_1.2s_ease-in-out_infinite]" />
        </svg>
      );
    case "storm":
      return (
        <svg {...common}>
          <path d="M7.5 12.5h9.2a3.2 3.2 0 0 0 .2-6.4 4.4 4.4 0 0 0-8.4 1.6 2.8 2.8 0 0 0-1 4.8Z" />
          <path d="M11 14 9.5 17h2.2L10.2 21" className="animate-pulse" />
        </svg>
      );
    case "snow":
      return (
        <svg {...common}>
          <path d="M7.5 13h9.2a3.2 3.2 0 0 0 .2-6.4 4.4 4.4 0 0 0-8.4 1.6 2.8 2.8 0 0 0-1 4.8Z" />
          <path d="M9 16.5h0.01M12.5 17.5h0.01M16 16.5h0.01" strokeWidth={2.5} className="animate-pulse" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M7.5 17h9.2a3.4 3.4 0 0 0 .2-6.8 4.6 4.6 0 0 0-8.7 1.7A3 3 0 0 0 7.5 17Z" />
        </svg>
      );
  }
}
