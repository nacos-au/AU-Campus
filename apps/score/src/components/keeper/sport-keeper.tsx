"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Match } from "@/lib/types/database";
import { AdminMatchLineupPanel } from "@/components/admin/admin-match-lineup-panel";
import { FootballPeriodControls } from "@/components/keeper/football-period-controls";
import { KeeperActionBar } from "@/components/keeper/keeper-action-bar";
import { KeeperEventTimeline } from "@/components/keeper/keeper-event-timeline";
import { KeeperRosterColumn } from "@/components/keeper/keeper-roster-column";
import { MatchClockControls } from "@/components/match/match-clock-controls";
import { MatchLifecycleControls } from "@/components/match/match-lifecycle-controls";
import {
  createKeeperLog,
  type KeeperLogEntry,
} from "@/lib/keeper/keeper-events";
import { getAthleteTeamMeta, getKeeperRosters } from "@/lib/keeper/keeper-rosters";
import {
  footballShootoutScore,
  getKeeperSportConfig,
  type KeeperTeamQuickAction,
} from "@/lib/keeper/keeper-sport-config";
import { useKeeperLogs } from "@/lib/keeper/use-keeper-logs";
import { useMatchClock } from "@/lib/keeper/use-match-clock";
import type { SquadPlayer } from "@/lib/data/demo-squads";
import { useMatchLifecycle } from "@/lib/match/use-match-lifecycle";
import { computeTrackResultsFromLogs, parseTimeToMs } from "@/lib/match/track-from-logs";
import { scoreClass } from "@/lib/match/score-highlight";
import { livePeriodLabel } from "@/lib/utils/sport-config";
import type { SportId } from "@/lib/utils/sport";
import { cn } from "@/lib/utils/cn";

type Side = "home" | "away";

function uniquePlayers<T extends { id: string }>(players: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const p of players) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

export function SportKeeper({ match, sport }: { match: Match; sport: SportId }) {
  const config = getKeeperSportConfig(sport);
  const lifecycle = useMatchLifecycle(match.id, {
    status: match.status as "scheduled" | "live" | "completed",
    scheduledAt: match.scheduled_at,
  });
  const { clock, setTimeLost, setRunning, resetClock, stopClock, setPeriod, formatTime } =
    useMatchClock(match.id, {
      period: match.current_period === "not_started" ? "half_1" : match.current_period,
    });
  const { logs, addLog, removeLog, updateLog } = useKeeperLogs(match.id);

  const [selected, setSelected] = useState<{ side: Side; playerId: string } | null>(null);
  const [pendingFoul, setPendingFoul] = useState<string | null>(null);
  const [subPrompt, setSubPrompt] = useState<{
    side: Side;
    playerOutId: string;
    playerOutName: string;
  } | null>(null);
  const [assistPrompt, setAssistPrompt] = useState<{
    logId: string;
    side: Side;
    scorerId: string;
  } | null>(null);
  const [finishPrompt, setFinishPrompt] = useState<{ logId: string; athleteName: string } | null>(null);
  const [finishTimeInput, setFinishTimeInput] = useState("");

  const allowsEt = Boolean(match.allows_extra_time ?? match.tournament?.rules?.extra_time);
  const allowsPens = Boolean(
    match.allows_penalty_shootout ?? match.tournament?.rules?.penalty_shootout
  );

  const fallbackRosters = useMemo(() => getKeeperRosters(match, sport), [match, sport]);
  const [homeSquad, setHomeSquad] = useState<SquadPlayer[]>(fallbackRosters.home);
  const [awaySquad, setAwaySquad] = useState<SquadPlayer[]>(fallbackRosters.away);
  const singleLabel = fallbackRosters.singleLabel;

  useEffect(() => {
    setHomeSquad(fallbackRosters.home);
    setAwaySquad(fallbackRosters.away);
  }, [fallbackRosters]);

  useEffect(() => {
    if (sport === "track" || sport === "tennis") return;
    let cancelled = false;
    async function loadLiveRosters() {
      try {
        const res = await fetch(`/api/matches/${match.id}/roster`);
        if (!res.ok) return;
        const json = (await res.json()) as { home?: SquadPlayer[]; away?: SquadPlayer[] };
        if (cancelled) return;
        if (json.home?.length) setHomeSquad(json.home);
        if (json.away?.length) setAwaySquad(json.away);
      } catch {
        /* keep fallback */
      }
    }
    void loadLiveRosters();
    return () => {
      cancelled = true;
    };
  }, [match.id, sport]);

  const logPeriod = sport === "football" ? clock.period : match.current_period;

  const primaryScore = config.computePrimaryScore(
    logs,
    match.home_team_id ?? "",
    match.away_team_id ?? ""
  );
  const setScore =
    config.showSetScore && config.computeSetScore
      ? config.computeSetScore(
          logs,
          match.home_team_id ?? "",
          match.away_team_id ?? "",
          logPeriod
        )
      : null;

  const matchTimeLabel =
    sport === "football" ? `${Math.floor(clock.elapsedSeconds / 60)}'` : formatTime();

  const periodLabel = livePeriodLabel(sport, logPeriod);
  const clockVariant = sport === "basketball" ? "basketball" : "football";
  const loggingEnabled = lifecycle.isLive;

  async function handleStartMatch() {
    resetClock(sport === "football" ? "half_1" : match.current_period);
    await lifecycle.startMatch();
  }

  async function syncPeriod(period: string) {
    setPeriod(period, {
      resetElapsed: period === "half_2" || period.startsWith("extra_time"),
    });
    try {
      await fetch(`/api/matches/${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_period: period,
          went_to_extra_time: period.startsWith("extra_time") || undefined,
        }),
      });
    } catch {
      /* local still works */
    }
  }

  async function handleEndMatch() {
    stopClock();
    const pens = footballShootoutScore(
      logs,
      match.home_team_id ?? "",
      match.away_team_id ?? ""
    );
    try {
      await fetch(`/api/matches/${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          home_score: primaryScore.home,
          away_score: primaryScore.away,
          home_penalties: clock.period === "penalty_shootout" || pens.home || pens.away ? pens.home : null,
          away_penalties: clock.period === "penalty_shootout" || pens.home || pens.away ? pens.away : null,
          current_period: "full_time",
          went_to_extra_time: allowsEt && logs.some((l) => l.period.startsWith("extra_time")),
        }),
      });
    } catch {
      /* ignore */
    }
    await lifecycle.endMatch();
  }

  function teamMeta(side: Side, playerId?: string) {
    if (sport === "track" && playerId) {
      return getAthleteTeamMeta(playerId);
    }
    if (config.layout === "single") {
      return getAthleteTeamMeta(playerId ?? "");
    }
    const team = side === "home" ? match.home_team : match.away_team;
    return {
      team_id: team?.id ?? "",
      team_name: team?.name ?? side,
      team_code: team?.department?.short_code ?? "—",
      team_logo_url: team?.logo_url ?? null,
    };
  }

  function squadFor(side: Side) {
    return side === "home" ? homeSquad : awaySquad;
  }

  function playerMeta(side: Side, playerId: string) {
    const player = squadFor(side).find((p) => p.id === playerId);
    return {
      player_id: playerId,
      player_name: player ? `${player.first_name} ${player.last_name}` : "Unknown",
    };
  }

  function pushLog(
    side: Side,
    eventType: string,
    playerId: string | null,
    playerName: string,
    extra?: Partial<KeeperLogEntry>
  ): KeeperLogEntry {
    const entry = createKeeperLog({
      match_time: matchTimeLabel,
      period: logPeriod,
      ...teamMeta(side, playerId ?? undefined),
      player_id: playerId,
      player_name: playerName,
      event_type: eventType,
      ...extra,
    });
    addLog(entry);
    return entry;
  }

  function selectPlayer(side: Side, playerId: string) {
    const effectiveSide = config.layout === "single" ? "home" : side;

    if (pendingFoul) {
      const { player_name } = playerMeta(effectiveSide, playerId);
      pushLog(effectiveSide, pendingFoul, playerId, player_name);
      setPendingFoul(null);
      setSelected({ side: effectiveSide, playerId });
      return;
    }

    if (selected?.side === effectiveSide && selected.playerId === playerId) {
      setSelected(null);
      setPendingFoul(null);
      return;
    }
    setSelected({ side: effectiveSide, playerId });
  }

  function logTeamQuickAction(side: Side, action: KeeperTeamQuickAction) {
    const meta = teamMeta(side);
    addLog(
      createKeeperLog({
        match_time: matchTimeLabel,
        period: logPeriod,
        ...meta,
        player_id: null,
        player_name: meta.team_name,
        event_type: action.eventType,
      })
    );
    setSelected(null);
    setPendingFoul(null);
  }

  function handleAction(eventType: string) {
    if (!selected) return;
    const { player_name, player_id } = playerMeta(selected.side, selected.playerId);

    if (eventType === "substitution" && sport === "football") {
      setSubPrompt({
        side: selected.side,
        playerOutId: player_id,
        playerOutName: player_name,
      });
      setSelected(null);
      setPendingFoul(null);
      return;
    }

    if (eventType === "finish" && config.promptFinishTime) {
      const entry = pushLog(selected.side, eventType, player_id, player_name);
      setFinishPrompt({ logId: entry.id, athleteName: player_name });
      setFinishTimeInput("");
      setSelected(null);
      return;
    }

    if (config.assistAfter.includes(eventType)) {
      const entry = pushLog(selected.side, eventType, player_id, player_name);
      setAssistPrompt({ logId: entry.id, side: selected.side, scorerId: selected.playerId });
      setSelected(null);
      return;
    }

    pushLog(selected.side, eventType, player_id, player_name);
    setSelected(null);
    setPendingFoul(null);
  }

  function completeSub(playerInId: string) {
    if (!subPrompt) return;
    const incoming = playerMeta(subPrompt.side, playerInId);
    pushLog(subPrompt.side, "substitution", subPrompt.playerOutId, subPrompt.playerOutName, {
      details: {
        player_out_id: subPrompt.playerOutId,
        player_out_name: subPrompt.playerOutName,
        player_in_id: playerInId,
        player_in_name: incoming.player_name,
      },
    });
    setSubPrompt(null);
  }

  function handleFoulChip(cardType: string) {
    if (selected) {
      const { player_name, player_id } = playerMeta(selected.side, selected.playerId);
      pushLog(selected.side, cardType, player_id, player_name);
      setSelected(null);
      setPendingFoul(null);
      return;
    }
    setPendingFoul((prev) => (prev === cardType ? null : cardType));
  }

  function addAssist(assistPlayerId: string) {
    if (!assistPrompt) return;
    const assist = squadFor(assistPrompt.side).find((p) => p.id === assistPlayerId);
    if (!assist) return;
    updateLog(assistPrompt.logId, {
      assist_player_id: assistPlayerId,
      assist_player_name: `${assist.first_name} ${assist.last_name}`,
    });
    setAssistPrompt(null);
  }

  function saveFinishTime() {
    if (!finishPrompt || !finishTimeInput.trim()) return;
    const timeMs = parseTimeToMs(finishTimeInput.trim());
    updateLog(finishPrompt.logId, {
      details: {
        time_display: finishTimeInput.trim(),
        time_ms: timeMs,
      },
    });
    setFinishPrompt(null);
    setFinishTimeInput("");
  }

  const selectedPlayer = selected
    ? squadFor(selected.side).find((p) => p.id === selected.playerId)
    : null;
  const selectedTeam =
    config.layout === "single"
      ? match.home_team
      : selected?.side === "home"
        ? match.home_team
        : match.away_team;

  const assistSquad = assistPrompt
    ? uniquePlayers(squadFor(assistPrompt.side).filter((p) => p.id !== assistPrompt.scorerId))
    : [];

  function handleRemove(id: string) {
    removeLog(id);
    if (assistPrompt?.logId === id) setAssistPrompt(null);
    if (finishPrompt?.logId === id) setFinishPrompt(null);
  }

  const trackResults = useMemo(() => {
    if (sport !== "track") return [];
    return computeTrackResultsFromLogs(logs).map((r) => ({
      id: r.log_id ?? r.player_id,
      name: r.athlete_name,
      time: r.time_display,
      code: r.department_code,
      status: r.status,
      rank: r.rank,
    }));
  }, [logs, sport]);

  const homeTeamId = match.home_team_id;
  const awayTeamId = match.away_team_id;
  const tournamentId = match.tournament_id;
  const showLineupSetup =
    Boolean(tournamentId) &&
    lifecycle.status === "scheduled" &&
    sport !== "track" &&
    sport !== "tennis" &&
    Boolean(homeTeamId && awayTeamId);

  return (
    <div className="mx-auto max-w-4xl">
      {showLineupSetup && tournamentId && homeTeamId && awayTeamId && (
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <AdminMatchLineupPanel
            matchId={match.id}
            tournamentId={tournamentId}
            teamId={homeTeamId}
            teamName={match.home_team?.name ?? "Team A"}
          />
          <AdminMatchLineupPanel
            matchId={match.id}
            tournamentId={tournamentId}
            teamId={awayTeamId}
            teamName={match.away_team?.name ?? "Team B"}
          />
        </div>
      )}
      <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-rule bg-white/95 px-4 py-3 backdrop-blur sm:-mx-0 sm:rounded-xl sm:border sm:px-4">
        <MatchLifecycleControls
          status={lifecycle.status}
          scheduledAt={match.scheduled_at}
          onStart={handleStartMatch}
          onEnd={handleEndMatch}
          className="mb-3"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            {config.showRunningClock ? (
              <span className="font-mono text-3xl font-bold tabular-nums sm:text-4xl">{formatTime()}</span>
            ) : (
              <span className="font-display text-lg font-extrabold">{match.home_team?.name}</span>
            )}
            {config.showPeriodBadge && (
              <span className="inline-flex w-fit rounded-full bg-surface px-2.5 py-0.5 font-display text-xs font-bold">
                {periodLabel}
              </span>
            )}
            {sport === "football" && (
              <div className="flex flex-wrap gap-1.5 text-[10px] font-bold uppercase tracking-wide text-accent/55">
                {allowsEt && <span className="rounded-full border border-rule px-2 py-0.5">ET on</span>}
                {allowsPens && <span className="rounded-full border border-rule px-2 py-0.5">Pens on</span>}
              </div>
            )}
            {config.showPrimaryScore && (
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-display text-lg font-extrabold tabular-nums">
                  <span className={scoreClass(primaryScore.home, primaryScore.away, "home", "sm")}>
                    {primaryScore.home}
                  </span>
                  <span className="mx-1 opacity-30">–</span>
                  <span className={scoreClass(primaryScore.home, primaryScore.away, "away", "sm")}>
                    {primaryScore.away}
                  </span>
                  <span className="ml-1.5 text-xs font-semibold uppercase opacity-40">
                    {config.primaryScoreLabel}
                  </span>
                </span>
                {setScore && (
                  <span className="font-display text-sm font-bold tabular-nums opacity-70">
                    {config.setScoreLabel}: {setScore.home}–{setScore.away}
                  </span>
                )}
              </div>
            )}
          </div>
          {config.showClockToggles && (
            <MatchClockControls
              variant={clockVariant}
              isRunning={clock.isRunning}
              isTimeLost={clock.isTimeLost}
              disabled={!loggingEnabled}
              onStop={() => setRunning(false)}
              onResume={() => {
                setTimeLost(false);
                setRunning(true);
              }}
              onPlaying={() => {
                setTimeLost(false);
                setRunning(true);
              }}
              onTimeLost={() => setTimeLost(true)}
              clockOnLabel={config.clockOnLabel}
              clockOffLabel={config.clockOffLabel}
            />
          )}
        </div>
        {sport === "football" && loggingEnabled && (
          <div className="mt-3 border-t border-rule pt-3">
            <FootballPeriodControls
              period={clock.period}
              allowsExtraTime={allowsEt}
              allowsPenaltyShootout={allowsPens}
              onSelect={(p) => void syncPeriod(p)}
            />
          </div>
        )}
        {trackResults.length > 0 && (
          <ol className="mt-3 flex flex-wrap gap-2 border-t border-rule pt-3 text-xs font-bold">
            {trackResults.map((r) => (
              <li
                key={r.id}
                className={cn(
                  "rounded-full px-2.5 py-1 tabular-nums",
                  r.status === "dnf" || r.status === "false_start"
                    ? "bg-red-50 text-red-700"
                    : "bg-surface"
                )}
              >
                {r.rank > 0 ? `${r.rank}. ` : ""}
                {r.code} {r.name} {r.status === "finished" ? `${r.time}s` : r.time}
              </li>
            ))}
          </ol>
        )}
      </div>

      {!loggingEnabled && lifecycle.isScheduled && (
        <p className="mb-4 rounded-lg bg-surface px-3 py-2 text-center text-sm font-semibold opacity-70">
          Start the match to begin logging events.
        </p>
      )}

      {loggingEnabled && (
        <section className="mb-4">
          <h2 className="mb-2 font-display text-xs font-extrabold uppercase tracking-wide opacity-50">
            {config.logSectionLabel}
          </h2>
          <KeeperEventTimeline logs={logs} onRemove={handleRemove} />
        </section>
      )}

      {loggingEnabled && subPrompt && (
        <div className="mb-4 rounded-xl border border-accent/30 bg-accent/5 p-4">
          <p className="mb-3 text-center font-display text-sm font-bold">
            {subPrompt.playerOutName} off — tap player coming on
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {uniquePlayers(
              squadFor(subPrompt.side).filter((p) => p.id !== subPrompt.playerOutId)
            ).map((p) => (
              <button
                key={`sub-in-${p.id}`}
                type="button"
                onClick={() => completeSub(p.id)}
                className="interactive-btn rounded-lg border border-rule bg-white px-3 py-2 font-display text-xs font-bold"
              >
                {p.jersey_number != null && <span className="mr-1 opacity-50">#{p.jersey_number}</span>}
                {p.first_name} {p.last_name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSubPrompt(null)}
              className="interactive-btn rounded-lg border border-dashed border-rule px-3 py-2 text-xs font-semibold opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loggingEnabled && assistPrompt && (
        <div className="mb-4 rounded-xl border border-[#004e28]/30 bg-[#004e28]/5 p-4">
          <p className="mb-3 text-center font-display text-sm font-bold">{config.assistPromptLabel}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {assistSquad.map((p) => (
              <button
                key={`assist-${p.id}-${p.jersey_number ?? ""}`}
                type="button"
                onClick={() => addAssist(p.id)}
                className="interactive-btn rounded-lg border border-rule bg-white px-3 py-2 font-display text-xs font-bold"
              >
                {p.jersey_number != null && <span className="mr-1 opacity-50">#{p.jersey_number}</span>}
                {p.first_name} {p.last_name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAssistPrompt(null)}
              className="interactive-btn rounded-lg border border-dashed border-rule px-3 py-2 text-xs font-semibold opacity-60"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {loggingEnabled && finishPrompt && (
        <div className="mb-4 rounded-xl border border-accent/30 bg-accent/5 p-4">
          <p className="mb-2 text-center font-display text-sm font-bold">
            Time for {finishPrompt.athleteName}?
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              placeholder="e.g. 10.58"
              value={finishTimeInput}
              onChange={(e) => setFinishTimeInput(e.target.value)}
              className="flex-1 rounded-lg border border-rule px-3 py-2 font-mono text-sm font-bold"
            />
            <button
              type="button"
              onClick={saveFinishTime}
              disabled={!finishTimeInput.trim()}
              className="btn-primary rounded-lg px-4 py-2 font-display text-sm font-bold disabled:opacity-40"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setFinishPrompt(null)}
              className="interactive-btn rounded-lg border border-rule px-3 py-2 text-sm font-semibold"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {loggingEnabled && pendingFoul && !selected && (
        <p className="mb-3 rounded-lg bg-accent/5 px-3 py-2 text-center text-sm font-semibold text-accent">
          Tap a player to apply {pendingFoul.replace(/_/g, " ")}
        </p>
      )}

      {loggingEnabled &&
        (config.layout === "single" ? (
        <KeeperRosterColumn
          team={match.home_team}
          players={homeSquad}
          selectedPlayerId={selected?.playerId ?? null}
          onSelectPlayer={(id) => selectPlayer("home", id)}
          title={singleLabel}
          laneHeader
        />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <KeeperRosterColumn
            team={match.home_team}
            players={homeSquad}
            selectedPlayerId={selected?.side === "home" ? selected.playerId : null}
            onSelectPlayer={(id) => selectPlayer("home", id)}
            teamQuickActions={config.teamQuickActions}
            onTeamQuickAction={(action) => logTeamQuickAction("home", action)}
          />
          <KeeperRosterColumn
            team={match.away_team}
            players={awaySquad}
            selectedPlayerId={selected?.side === "away" ? selected.playerId : null}
            onSelectPlayer={(id) => selectPlayer("away", id)}
            teamQuickActions={config.teamQuickActions}
            onTeamQuickAction={(action) => logTeamQuickAction("away", action)}
          />
        </div>
      ))}

      {loggingEnabled && selected && selectedPlayer && (
        <div className="mt-4">
          <KeeperActionBar
            playerName={`${selectedPlayer.first_name} ${selectedPlayer.last_name}`}
            teamName={selectedTeam?.name ?? ""}
            actions={config.playerActions}
            foulChips={config.foulChips}
            foulSectionLabel={config.foulSectionLabel}
            pendingFoul={pendingFoul}
            onAction={handleAction}
            onFoulChip={handleFoulChip}
            onDismiss={() => {
              setSelected(null);
              setPendingFoul(null);
            }}
          />
        </div>
      )}

      <Link
        href={`/matches/${match.id}?sport=${sport}`}
        className="mt-8 block text-center text-sm font-semibold text-accent hover:underline"
      >
        View public match page
      </Link>
    </div>
  );
}
