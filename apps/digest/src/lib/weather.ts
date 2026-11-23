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
  /** Short human reading of temp + sky for campus life. */
  reading: string;
};

/** Plain-language reading of Owo conditions for students. */
export function interpretWeather(
  tempC: number,
  condition: WeatherCondition
): string {
  const heat =
    tempC >= 34
      ? "It is very hot on campus — hydrate, and ease midday outdoor drills."
      : tempC >= 30
        ? "Warm and sticky — light kit and water bottles are your friends."
        : tempC >= 26
          ? "A comfortable warm day for classes, courts, and walking the grounds."
          : tempC >= 22
            ? "Mild for Owo — pleasant for long lectures and evening training."
            : "Cooler than usual — a light layer will feel good between buildings.";

  const sky: Record<WeatherCondition, string> = {
    clear: "Skies are clear over Owo.",
    partly: "Expect mixed sun and cloud.",
    cloud: "Cloud cover is keeping the sun soft.",
    fog: "Visibility is low in the mist — give yourself extra travel time.",
    drizzle: "Light drizzle is in the air — pack a cover for books and phones.",
    rain: "Rain is in play — waterproof bags and careful footing on the paths.",
    storm: "Thunderstorm risk — delay open-field sessions if lightning is near.",
    snow: "Unusual cold precipitation — treat outdoor plans with care.",
  };

  return `${sky[condition]} ${heat}`;
}

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
    const tempC = Math.round(temp);
    return {
      tempC,
      condition: mapped.condition,
      label: mapped.label,
      attribution: "Open-Meteo",
      reading: interpretWeather(tempC, mapped.condition),
    };
  } catch {
    return null;
  }
}
