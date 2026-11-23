export type WeatherCondition =
  | "clear"
  | "partly"
  | "cloud"
  | "fog"
  | "drizzle"
  | "rain"
  | "storm"
  | "snow";

export type WeatherSnapshot = {
  tempC: number;
  condition: WeatherCondition;
  label: string;
  attribution: string;
};

/** Achievers University / Owo, Ondo. */
export const OWO_COORDS = { lat: 7.196, lon: 5.586 } as const;

function mapWmo(code: number): { condition: WeatherCondition; label: string } {
  if (code === 0) return { condition: "clear", label: "Clear" };
  if (code === 1 || code === 2) return { condition: "partly", label: "Partly cloudy" };
  if (code === 3) return { condition: "cloud", label: "Cloudy" };
  if (code === 45 || code === 48) return { condition: "fog", label: "Fog" };
  if (code >= 51 && code <= 57) return { condition: "drizzle", label: "Drizzle" };
  if (code >= 61 && code <= 67) return { condition: "rain", label: "Rain" };
  if (code >= 71 && code <= 77) return { condition: "snow", label: "Snow" };
  if (code >= 80 && code <= 82) return { condition: "rain", label: "Showers" };
  if (code >= 85 && code <= 86) return { condition: "snow", label: "Snow showers" };
  if (code >= 95 && code <= 99) return { condition: "storm", label: "Thunderstorm" };
  return { condition: "cloud", label: "Cloudy" };
}

export async function fetchOwoWeather(): Promise<WeatherSnapshot | null> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(OWO_COORDS.lat));
    url.searchParams.set("longitude", String(OWO_COORDS.lon));
    url.searchParams.set("current", "temperature_2m,weather_code");
    url.searchParams.set("timezone", "Africa/Lagos");

    const res = await fetch(url.toString(), {
      next: { revalidate: 1800 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      current?: { temperature_2m?: number; weather_code?: number };
    };
    const temp = data.current?.temperature_2m;
    const code = data.current?.weather_code;
    if (typeof temp !== "number" || typeof code !== "number") return null;

    const mapped = mapWmo(code);
    return {
      tempC: Math.round(temp),
      condition: mapped.condition,
      label: mapped.label,
      attribution: "Open-Meteo",
    };
  } catch {
    return null;
  }
}
