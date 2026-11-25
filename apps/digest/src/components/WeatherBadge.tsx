import { WeatherIcon } from "@/components/WeatherIcon";
import { fetchCampusWeather } from "@/lib/weather";

type Props = {
  className?: string;
  showPlace?: boolean;
  size?: "sm" | "lg";
};

export async function WeatherBadge({
  className = "",
  showPlace = false,
  size = "sm",
}: Props) {
  const weather = await fetchCampusWeather();
  if (!weather) return null;

  const title = `${weather.label} on Achievers campus · ${weather.tempC}°C · ${weather.attribution}`;
  const iconClass = size === "lg" ? "h-6 w-6 shrink-0" : "h-4 w-4 shrink-0";
  const tempClass =
    size === "lg"
      ? "text-sm font-semibold tabular-nums leading-none tracking-tight"
      : "text-[11px] font-semibold tabular-nums leading-none tracking-tight";

  return (
    <span
      title={title}
      aria-label={title}
      className={`inline-flex items-center gap-1.5 text-ink ${className}`}
    >
      <WeatherIcon condition={weather.condition} className={iconClass} />
      <span className={tempClass}>
        {weather.tempC}°
        {showPlace ? (
          <span className="ml-1 font-medium text-ink-soft">Campus</span>
        ) : null}
      </span>
    </span>
  );
}
