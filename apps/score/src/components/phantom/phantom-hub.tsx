"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PhantomIcon } from "@/components/phantom/phantom-icon";
import {
  PHANTOM_FORMATS,
  defaultSettings,
  periodLabelFor,
  suggestMiniLeagueStructure,
  validatePhantomSettings,
} from "@/lib/phantom/formats";
import {
  createPhantomSessionLocal,
  listPhantomSessionsLocal,
  savePhantomSessionLocal,
} from "@/lib/phantom/store";
import {
  PHANTOM_BRAND,
  type PhantomFormat,
  type PhantomSession,
  type PhantomSettings,
} from "@/lib/phantom/types";
import { SPORT_LABELS, type SportId } from "@/lib/utils/sport";
import { cn } from "@/lib/utils/cn";
const SPORTS: SportId[] = ["football", "basketball", "volleyball", "tennis"];

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="font-semibold">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          className="btn-filled flex h-10 w-10 items-center justify-center rounded-lg border border-rule bg-white font-display text-lg font-bold text-accent"
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="min-w-[3rem] text-center font-display text-lg font-extrabold text-accent">
          {value}
        </span>
        <button
          type="button"
          className="btn-filled flex h-10 w-10 items-center justify-center rounded-lg border border-rule bg-white font-display text-lg font-bold text-accent"
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </label>
  );
}

export function PhantomHub() {
  const router = useRouter();
  const [step, setStep] = useState<"format" | "settings">("format");
  const [format, setFormat] = useState<PhantomFormat | null>(null);
  const [settings, setSettings] = useState<PhantomSettings | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const recent = useMemo(
    () => listPhantomSessionsLocal().filter((s) => s.status === "completed").slice(0, 6),
    []
  );

  function pickFormat(id: PhantomFormat) {
    const sport: SportId = id === "penalties" ? "football" : "football";
    setFormat(id);
    setSettings(defaultSettings(sport, id));
    setError("");
    setStep("settings");
  }

  function updateTeams(names: string[]) {
    if (!settings) return;
    const teams = names.map((name, i) => ({
      id: `team-${i + 1}`,
      name: name.trim() || "",
    }));
    const structure =
      settings.format === "mini_league"
        ? suggestMiniLeagueStructure(teams.filter((t) => t.name).length) ??
          settings.mini_league_structure
        : settings.mini_league_structure;
    setSettings({ ...settings, teams, mini_league_structure: structure ?? undefined });
  }

  async function startSession() {
    if (!settings) return;
    setBusy(true);
    setError("");

    const prepared: PhantomSettings = {
      ...settings,
      teams: settings.teams
        .map((t, i) => ({ ...t, name: t.name.trim() || `Side ${i + 1}`, id: t.id || `team-${i + 1}` }))
        .filter((t) => t.name),
    };

    // Re-trim empty: validation wants explicit empty detection before fill
    const rawNames = settings.teams.map((t) => t.name.trim());
    const checkSettings: PhantomSettings = {
      ...settings,
      teams: settings.teams.map((t, i) => ({ ...t, name: rawNames[i] ?? "" })),
    };
    const validation = validatePhantomSettings(checkSettings);
    if (validation) {
      setError(validation);
      setBusy(false);
      return;
    }

    const finalSettings: PhantomSettings = {
      ...prepared,
      sport: format === "penalties" ? "football" : prepared.sport,
      teams: checkSettings.teams.map((t, i) => ({
        ...t,
        name: t.name.trim(),
        id: t.id || `team-${i + 1}`,
      })),
    };

    try {
      const res = await fetch("/api/phantom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || undefined, settings: finalSettings }),
      });
      const json = (await res.json()) as {
        session?: PhantomSession;
        error?: string;
        warning?: string;
      };
      if (!res.ok) {
        setError(json.error ?? `Could not start Phantom (${res.status}).`);
        return;
      }
      if (json.session) {
        savePhantomSessionLocal(json.session);
        if (json.warning) {
          // Still proceed — session is local; surface warning briefly via query not needed
        }
        router.push(`${PHANTOM_BRAND.path}/${json.session.id}`);
        return;
      }
      setError(json.error ?? "Could not start Phantom — no session returned.");
    } catch (err) {
      const local = createPhantomSessionLocal({ title, settings: finalSettings });
      savePhantomSessionLocal(local);
      router.push(`${PHANTOM_BRAND.path}/${local.id}`);
      // If offline path used, still ok — but note if unexpected
      if (err) {
        // local fallback succeeded
      }
    } finally {
      setBusy(false);
    }
  }

  const hideSportPicker = format === "penalties";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white shadow-sm">
          <PhantomIcon size={28} className="text-white" />
        </div>
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-accent/50">
            AU Score
          </p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-accent sm:text-4xl">
            {PHANTOM_BRAND.name}
          </h1>
          <p className="mt-1 text-sm text-accent/70">{PHANTOM_BRAND.tagline}</p>
        </div>
      </div>

      {step === "format" && (
        <section>
          <h2 className="mb-3 font-display text-lg font-extrabold">Choose a format</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {PHANTOM_FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => pickFormat(f.id)}
                className="rounded-2xl border border-rule bg-white p-5 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition hover:border-accent/40"
              >
                <p className="font-display text-lg font-extrabold text-accent">{f.title}</p>
                <p className="mt-1 text-sm text-accent/65">{f.blurb}</p>
              </button>
            ))}
          </div>

          {recent.length > 0 && (
            <div className="mt-10">
              <h2 className="mb-3 font-display text-lg font-extrabold">Recent Phantoms</h2>
              <ul className="divide-y divide-rule rounded-2xl border border-rule bg-white">
                {recent.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`${PHANTOM_BRAND.path}/${s.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-surface"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-display text-sm font-bold">{s.title}</span>
                        <span className="text-xs opacity-50">Code {s.code}</span>
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wide text-accent/50">
                        Open
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {step === "settings" && settings && format && (
        <section className="space-y-6">
          <button
            type="button"
            onClick={() => {
              setStep("format");
              setError("");
            }}
            className="text-sm font-bold text-accent/60 hover:text-accent"
          >
            ← Change format
          </button>

          <div>
            <h2 className="font-display text-lg font-extrabold">
              {PHANTOM_FORMATS.find((f) => f.id === format)?.title} settings
            </h2>
            <p className="text-sm text-accent/65">Tune the session, then start.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {!hideSportPicker && (
              <label className="block text-sm">
                <span className="font-semibold">Sport</span>
                <select
                  className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
                  value={settings.sport}
                  onChange={(e) => {
                    const sport = e.target.value as SportId;
                    setSettings({
                      ...defaultSettings(sport, format),
                      teams: settings.teams,
                      track_assists: sport === "football",
                      period_label: periodLabelFor(sport, format),
                      set_duration_minutes: settings.set_duration_minutes,
                      first_set_goals_to_win: settings.first_set_goals_to_win,
                      subsequent_set_goals_to_win: settings.subsequent_set_goals_to_win,
                      one_goal_throughout: settings.one_goal_throughout,
                    });
                  }}
                >
                  {SPORTS.filter((s) =>
                    PHANTOM_FORMATS.find((f) => f.id === format)?.sports.includes(s)
                  ).map((s) => (
                    <option key={s} value={s}>
                      {SPORT_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className={cn("block text-sm", hideSportPicker && "sm:col-span-2")}>
              <span className="font-semibold">Session title</span>
              <input
                className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional — e.g. Beatrice Cup"
              />
            </label>

            {format !== "penalties" && format !== "sets" && (
              <label className="block text-sm">
                <span className="font-semibold">Scoring</span>
                <select
                  className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
                  value={settings.scoring_mode}
                  onChange={(e) => {
                    const scoring_mode = e.target.value as PhantomSettings["scoring_mode"];
                    setSettings({
                      ...settings,
                      scoring_mode,
                      goal_target: scoring_mode === "goals_only" ? settings.goal_target ?? 5 : null,
                      period_minutes: scoring_mode === "timed" ? settings.period_minutes || 20 : 0,
                    });
                  }}
                >
                  <option value="timed">Monitor time</option>
                  <option value="goals_only">Goals only (race to N)</option>
                </select>
              </label>
            )}

            {settings.scoring_mode === "timed" && format !== "sets" && (
              <>
                <Stepper
                  label={`${settings.period_label} length (min)`}
                  value={settings.period_minutes}
                  min={1}
                  max={90}
                  onChange={(period_minutes) => setSettings({ ...settings, period_minutes })}
                />
                <Stepper
                  label={`Number of ${settings.period_label.toLowerCase()}s`}
                  value={settings.period_count}
                  min={1}
                  max={6}
                  onChange={(period_count) => setSettings({ ...settings, period_count })}
                />
              </>
            )}

            {settings.scoring_mode === "goals_only" && (
              <Stepper
                label="First to (goals)"
                value={settings.goal_target ?? 5}
                min={1}
                max={50}
                onChange={(goal_target) => setSettings({ ...settings, goal_target })}
              />
            )}

            {format === "sets" && (
              <>
                <Stepper
                  label="Set duration (min)"
                  value={settings.set_duration_minutes ?? 10}
                  min={1}
                  max={60}
                  onChange={(set_duration_minutes) =>
                    setSettings({
                      ...settings,
                      set_duration_minutes,
                      period_minutes: set_duration_minutes,
                      scoring_mode: "sets",
                    })
                  }
                />
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.one_goal_throughout)}
                    onChange={(e) =>
                      setSettings({ ...settings, one_goal_throughout: e.target.checked })
                    }
                  />
                  <span className="font-semibold">One goal wins every set</span>
                </label>
                {!settings.one_goal_throughout && (
                  <>
                    <Stepper
                      label="First set — goals to win"
                      value={settings.first_set_goals_to_win ?? 2}
                      min={1}
                      max={10}
                      onChange={(first_set_goals_to_win) =>
                        setSettings({ ...settings, first_set_goals_to_win })
                      }
                    />
                    <Stepper
                      label="Later sets — goals to win"
                      value={settings.subsequent_set_goals_to_win ?? 1}
                      min={1}
                      max={10}
                      onChange={(subsequent_set_goals_to_win) =>
                        setSettings({ ...settings, subsequent_set_goals_to_win })
                      }
                    />
                  </>
                )}
                <p className="text-xs text-accent/60 sm:col-span-2">
                  Winner stays; loser is replaced by the next side in pick order. On a time draw,
                  both leave and the next two in sequence play.
                </p>
              </>
            )}

            {format === "mini_league" && (
              <p className="text-xs text-accent/60 sm:col-span-2">
                {settings.teams.filter((t) => t.name.trim()).length <= 8
                  ? "3–8 teams → single round-robin table (W3 D1 L0 for football)."
                  : "12–32 (multiple of 4) → World Cup–style groups of 4."}
              </p>
            )}

            {settings.sport === "football" && format !== "penalties" && (
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={settings.track_assists}
                  onChange={(e) => setSettings({ ...settings, track_assists: e.target.checked })}
                />
                <span className="font-semibold">Name assists when logging goals</span>
              </label>
            )}
          </div>

          <TeamFields
            format={format}
            teams={settings.teams.map((t) => t.name)}
            onChange={updateTeams}
          />

          <button
            type="button"
            disabled={busy}
            onClick={() => void startSession()}
            className="btn-primary w-full rounded-xl px-4 py-3 font-display text-base font-extrabold text-white disabled:opacity-40 sm:w-auto"
          >
            {busy ? "Starting…" : "Start first match"}
          </button>
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function TeamFields({
  format,
  teams,
  onChange,
}: {
  format: PhantomFormat;
  teams: string[];
  onChange: (names: string[]) => void;
}) {
  const min = format === "mini_league" || format === "sets" ? (format === "sets" ? 3 : 3) : 2;
  const max = format === "mini_league" ? 32 : format === "sets" ? 16 : 2;
  const names = teams.length >= min ? teams : [...teams, ...Array(min - teams.length).fill("")];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-base font-extrabold">
          {format === "sets" ? "Rotation queue (pick order)" : "Teams"}
        </h3>
        {(format === "mini_league" || format === "sets") && names.length < max && (
          <button
            type="button"
            className="text-sm font-bold text-accent hover:underline"
            onClick={() => onChange([...names, ""])}
          >
            + Add team
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {names.slice(0, max).map((name, i) => (
          <label key={i} className="block text-sm">
            <span className="font-semibold">Team {i + 1}</span>
            <input
              className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
              value={name}
              placeholder={`Side ${i + 1}`}
              onChange={(e) => {
                const next = [...names];
                next[i] = e.target.value;
                onChange(next);
              }}
            />
          </label>
        ))}
      </div>
      {format === "mini_league" && names.length > max && (
        <p className="mt-2 text-xs font-semibold text-red-600">Maximum {max} teams.</p>
      )}
    </div>
  );
}
