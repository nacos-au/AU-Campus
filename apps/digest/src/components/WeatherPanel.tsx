import { WeatherIcon } from "@/components/WeatherIcon";
import type { WeatherSnapshot } from "@/lib/weather";

type Props = {
  weather: WeatherSnapshot;
  placeLabel?: string;
};

/** Large interpretive weather block for the home rail (above Breaking). */
export function WeatherPanel({
  weather,
  placeLabel = "Owo, Ondo",
}: Props) {
  return (
    <div className="mb-6 hidden border-b border-rule pb-6 lg:block">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">
        Campus weather
      </p>
      <div className="mt-3 flex items-start gap-4">
        <WeatherIcon
          condition={weather.condition}
          className="mt-1 h-14 w-14 shrink-0 text-ink"
        />
        <div className="min-w-0">
          <p className="font-serif text-5xl font-bold leading-none tracking-tight text-ink tabular-nums">
            {weather.tempC}°
            <span className="ml-1 text-2xl font-semibold text-ink-soft">C</span>
          </p>
          <p className="mt-2 text-sm font-semibold text-ink">
            {weather.label}
            <span className="font-normal text-ink-soft"> · {placeLabel}</span>
          </p>
        </div>
      </div>
      <p className="mt-4 font-serif text-[15px] leading-relaxed text-ink-soft">
        {weather.reading}
      </p>
    </div>
  );
}
