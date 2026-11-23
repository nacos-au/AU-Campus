import { WeatherIcon } from "@/components/WeatherIcon";
import { fetchOwoWeather } from "@/lib/weather";

type Props = {
  className?: string;
  /** Compact = icon + degrees only (header). */
  showPlace?: boolean;
};

export async function WeatherBadge({
  className = "",
  showPlace = false,
}: Props) {
  const weather = await fetchOwoWeather();
  if (!weather) return null;

  const title = `${weather.label} in Owo · ${weather.tempC}°C · ${weather.attribution}`;

  return (
    <span
      title={title}
      aria-label={title}
      className={`inline-flex items-center gap-1.5 text-ink ${className}`}
    >
      <WeatherIcon condition={weather.condition} className="h-4 w-4 shrink-0" />
      <span className="text-[11px] font-semibold tabular-nums leading-none tracking-tight">
        {weather.tempC}°
        {showPlace ? (
          <span className="ml-1 font-medium text-ink-soft">Owo</span>
        ) : null}
      </span>
    </span>
  );
}
