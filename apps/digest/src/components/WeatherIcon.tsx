import type { WeatherCondition } from "@/lib/weather";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
} from "lucide-react";

type Props = {
  condition: WeatherCondition;
  className?: string;
};

/** Monochrome weather glyphs for masthead use (Lucide). */
export function WeatherIcon({ condition, className = "h-5 w-5" }: Props) {
  const common = { className, strokeWidth: 1.75, "aria-hidden": true as const };

  switch (condition) {
    case "clear":
      return <Sun {...common} className={`${className} origin-center animate-[spin_24s_linear_infinite]`} />;
    case "partly":
      return <CloudSun {...common} />;
    case "cloud":
      return <Cloud {...common} className={`${className} animate-[pulse_3.5s_ease-in-out_infinite]`} />;
    case "fog":
      return <CloudFog {...common} className={`${className} animate-[pulse_2.8s_ease-in-out_infinite]`} />;
    case "drizzle":
      return <CloudDrizzle {...common} className={`${className} animate-[pulse_1.6s_ease-in-out_infinite]`} />;
    case "rain":
      return <CloudRain {...common} className={`${className} animate-[pulse_1.2s_ease-in-out_infinite]`} />;
    case "storm":
      return <CloudLightning {...common} className={`${className} animate-pulse`} />;
    case "snow":
      return <CloudSnow {...common} className={`${className} animate-pulse`} />;
    default:
      return <Cloud {...common} />;
  }
}
