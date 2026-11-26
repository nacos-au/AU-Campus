import { WeatherIcon } from "@/components/WeatherIcon";
import { site } from "@/lib/site";
import type { WeatherSnapshot } from "@/lib/weather";
import type { IssueMeta } from "@/lib/weekly";
import type { WeeklyNameplate as NameplateSettings } from "@/lib/weekly-layout";
import type { MastheadWidget } from "@/lib/weekly-masthead";

type Props = {
  meta: IssueMeta;
  nameplate: NameplateSettings;
  weather: WeatherSnapshot | null;
};

function Ear({
  widget,
  side,
  nameplate,
  weather,
}: {
  widget: MastheadWidget;
  side: "left" | "right";
  nameplate: NameplateSettings;
  weather: WeatherSnapshot | null;
}) {
  const align = side === "left" ? "text-left" : "text-right";
  if (widget === "motto") {
    const motto = nameplate.motto.trim();
    if (!motto) return <div />;
    return (
      <p className={`font-serif text-sm italic leading-snug text-ink-soft @3xl:text-base ${align}`}>
        {motto}
      </p>
    );
  }
  if (widget === "note") {
    const note = nameplate.note.trim();
    if (!note) return <div />;
    return (
      <p
        className={`text-[10px] font-bold uppercase leading-snug tracking-[0.14em] text-ink @3xl:text-[11px] ${align}`}
      >
        {note}
      </p>
    );
  }
  if (widget === "weather") {
    if (!weather) return <div />;
    return (
      <div
        className={`flex flex-col gap-0.5 ${
          side === "left" ? "items-start" : "items-end"
        }`}
        title={`${weather.label} on campus · ${weather.attribution}`}
      >
        <span className="inline-flex items-center gap-1.5">
          <WeatherIcon
            condition={weather.condition}
            className="h-5 w-5 shrink-0 @3xl:h-6 @3xl:w-6"
          />
          <span className="font-serif text-xl font-bold tabular-nums leading-none @3xl:text-2xl">
            {weather.tempC}°C
          </span>
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
          {weather.label} · Campus
        </span>
      </div>
    );
  }
  return <div />;
}

/**
 * Newspaper nameplate: folio line, masthead flanked by two editable "ears"
 * (motto / weather / note), double rule, and a dateline. Everything numeric
 * comes from `meta`, which is derived from the issue's publish date.
 *
 * Sizes use container queries so the same markup reflows inside the editor's
 * device frames and on the live page.
 */
export function WeeklyNameplate({ meta, nameplate, weather }: Props) {
  const ears = (
    <>
      <Ear widget={nameplate.left} side="left" nameplate={nameplate} weather={weather} />
      <Ear widget={nameplate.right} side="right" nameplate={nameplate} weather={weather} />
    </>
  );

  return (
    <header>
      {/* Folio line */}
      <div className="flex items-center justify-between gap-3 border-b border-rule pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-soft @2xl:text-[11px]">
        <span>{meta.folio}</span>
        <span>Owo, Ondo State</span>
      </div>

      {/* Masthead with ears (wide) */}
      <div className="hidden items-center gap-6 pb-4 pt-5 @3xl:grid @3xl:grid-cols-[1fr_auto_1fr]">
        <Ear widget={nameplate.left} side="left" nameplate={nameplate} weather={weather} />
        <h1 className="text-center font-masthead text-5xl font-bold leading-none tracking-tight @4xl:text-6xl @5xl:text-7xl">
          {site.masthead}
        </h1>
        <Ear widget={nameplate.right} side="right" nameplate={nameplate} weather={weather} />
      </div>

      {/* Masthead with ears underneath (narrow) */}
      <div className="pb-3 pt-4 @3xl:hidden">
        <h1 className="text-center font-masthead text-4xl font-bold leading-none tracking-tight @xl:text-5xl">
          {site.masthead}
        </h1>
        <div className="mt-3 grid grid-cols-2 items-start gap-4">{ears}</div>
      </div>

      {/* Double rule */}
      <div aria-hidden>
        <div className="h-[3px] bg-ink" />
        <div className="mt-[2px] h-px bg-ink" />
      </div>

      {/* Dateline */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-ink py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink @2xl:justify-between @2xl:text-[11px]">
        <span>{meta.dateLong}</span>
        <span className="text-ink-soft">
          Week {meta.weekNo} · {meta.year}
        </span>
        <span>Free Issue</span>
      </div>
    </header>
  );
}
