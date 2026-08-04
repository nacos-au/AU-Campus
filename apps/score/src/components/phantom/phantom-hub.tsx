"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PhantomIcon } from "@/components/phantom/phantom-icon";
import {
  PHANTOM_FORMATS,
  defaultSettings,
  formatBestOfLabel,
  periodLabelFor,
} from "@/lib/phantom/formats";
import {
  createPhantomSessionLocal,
  listPhantomSessionsLocal,
  savePhantomSessionLocal,
} from "@/lib/phantom/store";
import { PHANTOM_BRAND, type PhantomFormat, type PhantomSession, type PhantomSettings } from "@/lib/phantom/types";
import { SPORT_LABELS, type SportId } from "@/lib/utils/sport";
import { cn } from "@/lib/utils/cn";

const SPORTS: SportId[] = ["football", "basketball", "volleyball", "tennis"];

export function PhantomHub() {
  const router = useRouter();
  const [step, setStep] = useState<"format" | "settings">("format");
  const [format, setFormat] = useState<PhantomFormat | null>(null);
  const [settings, setSettings] = useState<PhantomSettings | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const recent = useMemo(() => listPhantomSessionsLocal().filter((s) => s.status === "completed").slice(0, 6), []);

  function pickFormat(id: PhantomFormat) {
    const sport: SportId = "football";
    setFormat(id);
    setSettings(defaultSettings(sport, id));
    setStep("settings");
  }

  function updateTeams(names: string[]) {
    if (!settings) return;
    const teams = names.map((name, i) => ({
      id: `team-${i + 1}`,
      name: name.trim() || `Side ${i + 1}`,
    }));
    setSettings({ ...settings, teams });
  }

  async function startSession() {
    if (!settings) return;
    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/phantom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || undefined, settings }),
      });
      const json = (await res.json()) as { session?: PhantomSession; error?: string };
      if (res.ok && json.session) {
        savePhantomSessionLocal(json.session);
        router.push(`${PHANTOM_BRAND.path}/${json.session.id}`);
        return;
      }
      setError(json.error ?? "Could not start Phantom");
    } catch {
      const local = createPhantomSessionLocal({ title, settings });
      router.push(`${PHANTOM_BRAND.path}/${local.id}`);
      return;
    } finally {
      setBusy(false);
    }
  }

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
                        Share
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
            onClick={() => setStep("format")}
            className="text-sm font-bold text-accent/60 hover:text-accent"
          >
            ← Change format
          </button>

          <div>
            <h2 className="font-display text-lg font-extrabold">
              {PHANTOM_FORMATS.find((f) => f.id === format)?.title} settings
            </h2>
            <p className="text-sm text-accent/65">Tune the session, then start the first match.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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

            <label className="block text-sm">
              <span className="font-semibold">Session title</span>
              <input
                className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional — e.g. Hostel night"
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

            {settings.scoring_mode === "timed" && (
              <>
                <label className="block text-sm">
                  <span className="font-semibold">
                    {settings.period_label} length (min)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
                    value={settings.period_minutes}
                    onChange={(e) =>
                      setSettings({ ...settings, period_minutes: Number(e.target.value) || 0 })
                    }
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-semibold">Number of {settings.period_label.toLowerCase()}s</span>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
                    value={settings.period_count}
                    onChange={(e) =>
                      setSettings({ ...settings, period_count: Number(e.target.value) || 1 })
                    }
                  />
                </label>
              </>
            )}

            {settings.scoring_mode === "goals_only" && (
              <label className="block text-sm">
                <span className="font-semibold">First to</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
                  value={settings.goal_target ?? 5}
                  onChange={(e) =>
                    setSettings({ ...settings, goal_target: Number(e.target.value) || 1 })
                  }
                />
              </label>
            )}

            {format === "sets" && (
              <label className="block text-sm">
                <span className="font-semibold">
                  {formatBestOfLabel(settings.best_of, settings.period_label)}
                </span>
                <select
                  className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
                  value={settings.best_of}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      best_of: Number(e.target.value),
                      scoring_mode: "sets",
                    })
                  }
                >
                  <option value={1}>Single {settings.period_label.toLowerCase()}</option>
                  <option value={3}>Best of 3</option>
                  <option value={5}>Best of 5</option>
                </select>
              </label>
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
            onClick={startSession}
            className={cn(
              "btn-primary w-full rounded-xl px-4 py-3 font-display text-base font-extrabold text-white disabled:opacity-40 sm:w-auto"
            )}
          >
            {busy ? "Starting…" : "Start first match"}
          </button>
          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
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
  const min = format === "mini_league" ? 3 : 2;
  const max = format === "mini_league" ? 6 : 2;
  const names = teams.length >= min ? teams : [...teams, ...Array(min - teams.length).fill("")];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-base font-extrabold">Teams</h3>
        {format === "mini_league" && names.length < max && (
          <button
            type="button"
            className="text-sm font-bold text-accent hover:underline"
            onClick={() => onChange([...names, `Side ${names.length + 1}`])}
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
              onChange={(e) => {
                const next = [...names];
                next[i] = e.target.value;
                onChange(next);
              }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
