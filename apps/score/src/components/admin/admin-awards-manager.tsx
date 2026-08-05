"use client";

import { useEffect, useState } from "react";
import {
  ADMIN_AWARDS_STORAGE_KEY,
  AWARD_TYPE_OPTIONS,
  awardTypeLabel,
  getAwardsForSport,
  roleFromPosition,
  saveAwardOverridesToStorage,
  type AwardLineupPlayer,
  type AwardType,
  type SeasonAward,
} from "@/lib/data/demo-awards";
import { DEMO_PLAYERS, DEMO_TEAMS } from "@/lib/data/demo";
import { sportToDbId, SPORT_LABELS, type SportId } from "@/lib/utils/sport";

const STORAGE_KEY = ADMIN_AWARDS_STORAGE_KEY;

export function AdminAwardsManager() {
  const [sport, setSport] = useState<SportId>("football");
  const [overrides, setOverrides] = useState<SeasonAward[]>([]);
  const [awardType, setAwardType] = useState<AwardType>("player_of_season");
  const [playerId, setPlayerId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [week, setWeek] = useState("9");
  const [statValue, setStatValue] = useState("");
  const [lineup, setLineup] = useState<AwardLineupPlayer[]>([]);
  const [saved, setSaved] = useState(false);

  const isLineupAward = awardType === "team_of_week" || awardType === "team_of_season";

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setOverrides(JSON.parse(raw) as SeasonAward[]);
    } catch {
      /* ignore */
    }
  }, []);

  const sportDbId = sportToDbId(sport);
  const awards = getAwardsForSport(sportDbId, overrides);
  const teams = DEMO_TEAMS.filter((t) => t.sport_id === sportDbId);
  const players = DEMO_PLAYERS;

  function persist(next: SeasonAward[]) {
    setOverrides(next);
    saveAwardOverridesToStorage(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function toggleLineupPlayer(pid: string) {
    setLineup((prev) => {
      if (prev.some((l) => l.player_id === pid)) {
        return prev.filter((l) => l.player_id !== pid);
      }
      const player = players.find((p) => p.id === pid);
      if (!player) return prev;
      const club = DEMO_TEAMS.find(
        (t) => t.department_id === player.department_id && t.sport_id === sportDbId
      );
      return [
        ...prev,
        {
          player_id: player.id,
          player_name: `${player.first_name} ${player.last_name}`,
          team_id: club?.id ?? null,
          team_code: player.department?.short_code ?? "AU",
          team_logo_url: club?.logo_url ?? null,
          role: roleFromPosition(player.position),
          rating: 7.0,
          avatar_url: player.avatar_url,
        },
      ];
    });
  }

  function setLineupRating(pid: string, rating: number) {
    setLineup((prev) => prev.map((l) => (l.player_id === pid ? { ...l, rating } : l)));
  }

  async function handlePublish() {
    const player = players.find((p) => p.id === playerId);
    const team = teams.find((t) => t.id === teamId);
    const label =
      player
        ? `${player.first_name} ${player.last_name}`
        : team?.name ?? awardType;
    const ok = window.confirm(
      `Publish this award as Admin?\n\n${awardType.replaceAll("_", " ")} → ${label}\n\nThis updates the public awards board.`
    );
    if (!ok) return;

    const parsedValue = statValue.trim() ? Number(statValue) : null;
    const entry: SeasonAward = {
      id: `admin-${Date.now()}`,
      award_type: awardType,
      season: "2025/26",
      sport_id: sportDbId,
      week_number: awardType === "team_of_week" ? parseInt(week, 10) : null,
      player_id: playerId || null,
      team_id: teamId || null,
      player_name: player ? `${player.first_name} ${player.last_name}` : null,
      team_name: team?.name ?? null,
      value: parsedValue != null && !Number.isNaN(parsedValue) ? parsedValue : null,
      lineup: isLineupAward && lineup.length > 0 ? lineup : null,
      published: true,
      published_at: new Date().toISOString(),
    };
    const filtered = overrides.filter(
      (a) =>
        !(a.sport_id === sportDbId && a.award_type === awardType && (a.week_number ?? 0) === (entry.week_number ?? 0))
    );
    persist([...filtered, entry]);

    try {
      await fetch("/api/awards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
    } catch {
      /* demo/local still works */
    }
  }

  function resetDemo() {
    localStorage.removeItem(STORAGE_KEY);
    setOverrides([]);
  }

  return (
    <div className="table-card p-6">
      <h2 className="font-display text-lg font-extrabold">Season Awards</h2>
      <p className="mt-1 text-sm opacity-70">
        Set top scorer, Player of the Season, Team of the Season, and Team of the Week. Saved locally for demo; production uses{" "}
        <code className="text-xs">season_awards</code> table.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(Object.keys(SPORT_LABELS) as SportId[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSport(s)}
            className={
              sport === s
                ? "btn-filled rounded-lg border px-3 py-1.5 font-display text-xs font-bold"
                : "interactive-btn rounded-lg border border-rule px-3 py-1.5 font-display text-xs font-bold"
            }
          >
            {SPORT_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-semibold">Award</span>
          <select
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            value={awardType}
            onChange={(e) => setAwardType(e.target.value as AwardType)}
          >
            {AWARD_TYPE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {awardType === "team_of_week" && (
          <label className="block text-sm">
            <span className="font-semibold">Matchweek</span>
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
              value={week}
              onChange={(e) => setWeek(e.target.value)}
              min={1}
            />
          </label>
        )}
        <label className="block text-sm">
          <span className="font-semibold">Player</span>
          <select
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
          >
            <option value="">—</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.first_name} {p.last_name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Team</span>
          <select
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
          >
            <option value="">—</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Stat value (optional)</span>
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            value={statValue}
            onChange={(e) => setStatValue(e.target.value)}
            placeholder={awardType === "top_scorer" ? "Goals / points" : "—"}
          />
        </label>
      </div>

      {isLineupAward && (
        <div className="mt-4 rounded-lg border border-rule p-4">
          <p className="font-display text-sm font-extrabold">
            Lineup ({lineup.length} selected)
          </p>
          <p className="mt-0.5 text-xs opacity-60">
            Pick the XI (or squad) and set match ratings — this renders as the formation
            graphic on the Stats page. Roles come from each player&apos;s position.
          </p>
          <div className="mt-3 grid max-h-72 gap-1.5 overflow-y-auto sm:grid-cols-2">
            {players.map((p) => {
              const entry = lineup.find((l) => l.player_id === p.id);
              return (
                <div
                  key={p.id}
                  className={
                    entry
                      ? "flex items-center gap-2 rounded-lg border border-accent bg-accent/5 px-2.5 py-1.5 text-sm"
                      : "flex items-center gap-2 rounded-lg border border-rule px-2.5 py-1.5 text-sm"
                  }
                >
                  <input
                    type="checkbox"
                    checked={!!entry}
                    onChange={() => toggleLineupPlayer(p.id)}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {p.first_name} {p.last_name}
                    <span className="ml-1 text-[10px] uppercase opacity-50">
                      {roleFromPosition(p.position)}
                    </span>
                  </span>
                  {entry && (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={entry.rating}
                      onChange={(e) => setLineupRating(p.id, Number(e.target.value))}
                      className="w-16 rounded border border-rule px-1.5 py-0.5 font-mono text-xs"
                      aria-label={`Rating for ${p.first_name} ${p.last_name}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={handlePublish} className="btn-filled rounded-lg border px-4 py-2 font-display text-sm font-bold">
          Publish award
        </button>
        <button type="button" onClick={resetDemo} className="interactive-btn rounded-lg border border-rule px-4 py-2 font-display text-sm font-bold">
          Reset to defaults
        </button>
        {saved && <span className="self-center text-sm font-semibold text-accent">Saved</span>}
      </div>

      <ul className="mt-6 space-y-2 border-t border-rule pt-4 text-sm">
        {awards.map((a) => (
          <li key={a.id} className="flex justify-between gap-2">
            <span className="font-display font-bold">{awardTypeLabel(a.award_type)}</span>
            <span className="text-right opacity-80">
              {a.player_name && `${a.player_name} · `}
              {a.team_name}
              {a.week_number ? ` (MW ${a.week_number})` : ""}
              {a.value != null ? ` — ${a.value}` : ""}
            </span>
          </li>
        ))}
        {awards.length === 0 && <li className="opacity-60">No published awards for this sport.</li>}
      </ul>
    </div>
  );
}
