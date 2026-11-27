"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Match } from "@/lib/types/database";
import { AdminMatchLineupPanel } from "@/components/admin/admin-match-lineup-panel";
import { KeeperActionBar } from "@/components/keeper/keeper-action-bar";
import { KeeperEventTimeline } from "@/components/keeper/keeper-event-timeline";
import { KeeperMatchSettings } from "@/components/keeper/keeper-match-settings";
import { KeeperRosterColumn } from "@/components/keeper/keeper-roster-column";
import { NameModeToggle } from "@/components/ui/player-name";
import { playerDisplayName } from "@/lib/players/display-name";
import { useNameMode } from "@/lib/players/use-name-mode";
import { splitSquad, subPairsFromLogs } from "@/lib/keeper/squad-state";
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
  const [liveMatch, setLiveMatch] = useState(match);
  const lifecycle = useMatchLifecycle(match.id, {
    status: (liveMatch.status === "postponed" ? "scheduled" : liveMatch.status) as
      | "scheduled"
      | "live"
      | "completed",
    scheduledAt: liveMatch.scheduled_at,
  });
  const {
    clock,
    setTimeLost,
    setRunning,
    startRunning,
    stopClock,
    setPeriod,
    enterHalfTime,
    startSecondHalf,
    enterFullTime,
    formatTime,
    formatStoppageTime,
    formatMatchMinute,
    boardStoppage,
    setElapsed,
  } = useMatchClock(
    match.id,
    {
      period: match.current_period === "not_started" ? "half_1" : match.current_period,
      stoppageSeconds: match.clock_stoppage_seconds ?? 0,
      boardedStoppageMinutes: match.clock_boarded_stoppage_minutes ?? 0,
      elapsedSeconds: match.clock_elapsed_seconds ?? 0,
    },
    { syncToServer: true }
  );
  const { logs, addLog, removeLog, updateLog, clearLogs } = useKeeperLogs(match.id);

  const [selected, setSelected] = useState<{ side: Side; playerId: string } | null>(null);
  const [pendingFoul, setPendingFoul] = useState<string | null>(null);
  /** Multi-sub batch: each pair is one out→in logged as its own event. */
  const [subBatch, setSubBatch] = useState<{
    side: Side;
    pairs: { outId: string; outName: string; inId: string | null; inName: string | null }[];
    /** Which slot is waiting for a tap — out (new pair) or in (complete active). */
    phase: "pick_in" | "pick_out";
  } | null>(null);
  const [assistPrompt, setAssistPrompt] = useState<{
    logId: string;
    side: Side;
    scorerId: string;
  } | null>(null);
  const [finishPrompt, setFinishPrompt] = useState<{ logId: string; athleteName: string } | null>(null);
  const [finishTimeInput, setFinishTimeInput] = useState("");
  const [startError, setStartError] = useState("");

  const allowsEt = Boolean(match.allows_extra_time ?? match.tournament?.rules?.extra_time);
  const allowsPens = Boolean(
    match.allows_penalty_shootout ?? match.tournament?.rules?.penalty_shootout
  );

  const fallbackRosters = useMemo(() => getKeeperRosters(match, sport), [match, sport]);
  const [homeSquad, setHomeSquad] = useState<SquadPlayer[]>(fallbackRosters.home);
  const [awaySquad, setAwaySquad] = useState<SquadPlayer[]>(fallbackRosters.away);
  const singleLabel = fallbackRosters.singleLabel;
  const [rosterMaxSubs, setRosterMaxSubs] = useState<number | null>(null);
  const [subNotice, setSubNotice] = useState("");
  const [nameMode] = useNameMode();

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
        const json = (await res.json()) as {
          home?: SquadPlayer[];
          away?: SquadPlayer[];
          max_subs?: number | null;
        };
        if (cancelled) return;
        if (json.home?.length) setHomeSquad(json.home);
        if (json.away?.length) setAwaySquad(json.away);
        if (typeof json.max_subs === "number") setRosterMaxSubs(json.max_subs);
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

  const matchTimeLabel = sport === "football" ? formatMatchMinute() : formatTime();

  const tournamentConfig =
    match.tournament &&
    typeof (match.tournament as { config?: Record<string, unknown> }).config === "object"
      ? ((match.tournament as { config?: Record<string, unknown> }).config ?? {})
      : {};
  const maxSubsRaw = Number(tournamentConfig.max_subs);
  const maxSubs =
    rosterMaxSubs != null
      ? rosterMaxSubs
      : Number.isFinite(maxSubsRaw) && maxSubsRaw > 0
        ? maxSubsRaw
        : 5;

  const homeSubPairs = subPairsFromLogs(logs, match.home_team_id ?? "");
  const awaySubPairs = subPairsFromLogs(logs, match.away_team_id ?? "");
  const homeSplit = splitSquad(homeSquad, homeSubPairs);
  const awaySplit = splitSquad(awaySquad, awaySubPairs);
  /** Match-wide cap: subs already confirmed count against the batch being built. */
  const subsLeftFor = (side: Side) =>
    Math.max(0, maxSubs - (side === "home" ? homeSubPairs.length : awaySubPairs.length));

  /** Legal or nickname, for timeline and chips. Logs keep the legal name. */
  const nameFor = (playerId: string | null | undefined, fallback: string) => {
    if (!playerId) return fallback;
    const p = [...homeSquad, ...awaySquad].find((x) => x.id === playerId);
    return p ? playerDisplayName(p, nameMode) : fallback;
  };

  const periodLabel = livePeriodLabel(sport, logPeriod);
  const clockVariant = sport === "basketball" ? "basketball" : "football";
  const loggingEnabled = lifecycle.isLive;

  async function handleStartMatch() {
    setStartError("");
    const result = await lifecycle.startMatch();
    if ("error" in result) {
      setStartError(result.error);
      return;
    }
    // Every kick-off starts from scratch: empty log, 00:00, zero score (server wipe).
    clearLogs();
    startRunning(sport === "football" ? "half_1" : match.current_period);
  }

  function logBoardedStoppage(fromPeriod: string, boarded: number) {
    if (boarded <= 0) return;
    addLog(
      createKeeperLog({
        match_time: formatMatchMinute(),
        period: fromPeriod,
        team_id: "",
        team_name: "",
        team_code: "",
        team_logo_url: null,
        player_id: null,
        player_name: `+${boarded}`,
        event_type: "stoppage_boarded",
        details: { minutes: boarded, boarded_minutes: boarded },
      })
    );
  }

  async function patchPeriod(period: string, extra?: Record<string, unknown>) {
    try {
      await fetch(`/api/matches/${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_period: period,
          went_to_extra_time: period.startsWith("extra_time") || undefined,
          ...extra,
        }),
      });
      setLiveMatch((prev) => ({ ...prev, current_period: period, ...extra }));
    } catch {
      /* local still works */
    }
  }

  async function handleEnterHalfTime() {
    const from = clock.period;
    const boarded = boardStoppage();
    logBoardedStoppage(from, boarded);
    enterHalfTime();
    await patchPeriod("half_time");
  }

  async function handleStartSecondHalf() {
    startSecondHalf();
    await patchPeriod("half_2");
  }

  async function handleEnterFullTime() {
    const from = clock.period;
    const boarded = boardStoppage();
    logBoardedStoppage(from, boarded);
    enterFullTime();
    await patchPeriod("full_time");
  }

  async function syncPeriod(period: string) {
    if (sport === "football") {
      if (period === "half_time") {
        await handleEnterHalfTime();
        return;
      }
      if (period === "half_2") {
        await handleStartSecondHalf();
        return;
      }
      if (period === "full_time") {
        await handleEnterFullTime();
        return;
      }
      if (period.startsWith("extra_time")) {
        const boarded = boardStoppage();
        logBoardedStoppage(clock.period, boarded);
        setPeriod(period, { resetElapsed: true });
        await patchPeriod(period);
        return;
      }
    }
    setPeriod(period);
    await patchPeriod(period);
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

    if (subBatch && subBatch.side === effectiveSide) {
      handleSubBatchPick(playerId);
      return;
    }

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

  /** Begins a substitution with `outId` going off. Enforces on-pitch and match-wide cap. */
  function startSub(side: Side, outId: string, outName: string) {
    const split = side === "home" ? homeSplit : awaySplit;
    if (subsLeftFor(side) <= 0) {
      setSubNotice(`No substitutions left (max ${maxSubs}).`);
      return;
    }
    if (!split.xi.some((p) => p.id === outId)) {
      setSubNotice("Only a player on the pitch can be taken off.");
      return;
    }
    setSubNotice("");
    setSelected(null);
    setSubBatch({
      side,
      pairs: [{ outId, outName, inId: null, inName: null }],
      phase: "pick_in",
    });
  }

  function handleAction(eventType: string) {
    if (!selected) return;
    const { player_name, player_id } = playerMeta(selected.side, selected.playerId);

    if (
      eventType === "substitution" &&
      (sport === "football" || sport === "basketball" || sport === "volleyball")
    ) {
      startSub(selected.side, player_id, player_name);
      setSelected(null);
      setPendingFoul(null);
      return;
    }

    if (eventType === "disallowed_goal") {
      const original = logs.find(
        (l) =>
          l.player_id === player_id &&
          (l.event_type === "goal" ||
            l.event_type === "penalty_scored" ||
            l.event_type === "own_goal")
      );
      if (original) {
        disallowGoal(original);
      } else {
        pushLog(selected.side, "disallowed_goal", player_id, player_name, {
          details: { note: "no_matching_goal" },
        });
      }
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

  function handleSubBatchPick(playerId: string) {
    if (!subBatch) return;
    const { player_name } = playerMeta(subBatch.side, playerId);
    const usedIds = new Set(
      subBatch.pairs.flatMap((p) => [p.outId, p.inId].filter(Boolean) as string[])
    );

    const split = subBatch.side === "home" ? homeSplit : awaySplit;

    if (subBatch.phase === "pick_in") {
      const incomplete = subBatch.pairs.findIndex((p) => !p.inId);
      if (incomplete < 0) return;
      if (playerId === subBatch.pairs[incomplete].outId) return;
      if (usedIds.has(playerId)) return;
      if (!split.bench.some((p) => p.id === playerId)) {
        setSubNotice(
          split.subbedOff.some((p) => p.id === playerId)
            ? "That player was already subbed off and cannot return."
            : "Pick a substitute from the bench list."
        );
        return;
      }
      setSubNotice("");
      const pairs = subBatch.pairs.map((p, i) =>
        i === incomplete ? { ...p, inId: playerId, inName: player_name } : p
      );
      setSubBatch({ ...subBatch, pairs, phase: "pick_out" });
      return;
    }

    if (subBatch.pairs.length >= subsLeftFor(subBatch.side)) {
      setSubNotice(`No substitutions left (max ${maxSubs}).`);
      return;
    }
    if (usedIds.has(playerId)) return;
    if (!split.xi.some((p) => p.id === playerId)) {
      setSubNotice("Only a player on the pitch can be taken off.");
      return;
    }
    setSubNotice("");
    setSubBatch({
      ...subBatch,
      pairs: [
        ...subBatch.pairs,
        { outId: playerId, outName: player_name, inId: null, inName: null },
      ],
      phase: "pick_in",
    });
  }

  function confirmSubBatch() {
    if (!subBatch) return;
    const complete = subBatch.pairs.filter((p) => p.inId && p.inName);
    for (const pair of complete) {
      pushLog(subBatch.side, "substitution", pair.outId, pair.outName, {
        details: {
          player_out_id: pair.outId,
          player_out_name: pair.outName,
          player_in_id: pair.inId,
          player_in_name: pair.inName,
        },
      });
    }
    setSubBatch(null);
    setSubNotice("");
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
      details: { solo_goal: false },
    });
    setAssistPrompt(null);
  }

  function markSoloGoal() {
    if (!assistPrompt) return;
    updateLog(assistPrompt.logId, {
      assist_player_id: null,
      assist_player_name: null,
      details: { solo_goal: true },
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

  function sideForTeamId(teamId: string): Side {
    return teamId === match.away_team_id ? "away" : "home";
  }

  function disallowGoal(original: KeeperLogEntry) {
    if (
      original.event_type !== "goal" &&
      original.event_type !== "penalty_scored" &&
      original.event_type !== "own_goal"
    ) {
      return;
    }
    const side = sideForTeamId(original.team_id);
    pushLog(side, "disallowed_goal", original.player_id, original.player_name, {
      details: {
        original_event_id: original.id,
        original_event_type: original.event_type,
        original_match_time: original.match_time,
      },
    });
    handleRemove(original.id);
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
      {liveMatch.status === "postponed" && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-display font-bold">Postponed</p>
          <p className="mt-0.5">
            {liveMatch.postpone_reason?.trim() || "This fixture has been postponed."}
          </p>
        </div>
      )}
      {showLineupSetup && tournamentId && homeTeamId && awayTeamId && (
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <AdminMatchLineupPanel
            matchId={match.id}
            tournamentId={tournamentId}
            teamId={homeTeamId}
            teamName={match.home_team?.name ?? "Team A"}
            scheduledAt={liveMatch.scheduled_at}
          />
          <AdminMatchLineupPanel
            matchId={match.id}
            tournamentId={tournamentId}
            teamId={awayTeamId}
            teamName={match.away_team?.name ?? "Team B"}
            scheduledAt={liveMatch.scheduled_at}
          />
        </div>
      )}
      <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-rule bg-white/95 px-4 py-3 backdrop-blur sm:-mx-0 sm:rounded-xl sm:border sm:px-4">
        {lifecycle.isScheduled ? (
          <div className="mb-3 flex items-start justify-between gap-3">
            <MatchLifecycleControls
              status={lifecycle.status}
              scheduledAt={match.scheduled_at}
              onStart={() => void handleStartMatch()}
              onEnd={handleEndMatch}
              showEnd={false}
              className="min-w-0 flex-1"
            />
            <KeeperMatchSettings
              match={liveMatch}
              onMatchPatched={(patch) => setLiveMatch((prev) => ({ ...prev, ...patch }))}
              clockElapsedSeconds={clock.elapsedSeconds}
              onJumpClock={setElapsed}
              sport={sport}
              period={clock.period}
              allowsExtraTime={allowsEt}
              allowsPenaltyShootout={allowsPens}
              onSelectPeriod={(p) => void syncPeriod(p)}
              onEnterHalfTime={() => void handleEnterHalfTime()}
              onStartSecondHalf={() => void handleStartSecondHalf()}
              onEnterFullTime={() => void handleEnterFullTime()}
              onEndMatch={() => void handleEndMatch()}
              showEndMatch={false}
            />
          </div>
        ) : (
          <div className="relative mb-2 flex items-center justify-between gap-2">
            <MatchLifecycleControls
              status={lifecycle.status}
              scheduledAt={match.scheduled_at}
              onStart={() => void handleStartMatch()}
              onEnd={handleEndMatch}
              showEnd={false}
              className="shrink-0"
            />
            <KeeperMatchSettings
              match={liveMatch}
              onMatchPatched={(patch) => setLiveMatch((prev) => ({ ...prev, ...patch }))}
              clockElapsedSeconds={clock.elapsedSeconds}
              onJumpClock={setElapsed}
              sport={sport}
              period={clock.period}
              allowsExtraTime={allowsEt}
              allowsPenaltyShootout={allowsPens}
              onSelectPeriod={(p) => void syncPeriod(p)}
              onEnterHalfTime={() => void handleEnterHalfTime()}
              onStartSecondHalf={() => void handleStartSecondHalf()}
              onEnterFullTime={() => void handleEnterFullTime()}
              onEndMatch={() => void handleEndMatch()}
              showEndMatch={lifecycle.isLive}
            />
          </div>
        )}

        {config.showPrimaryScore && (
          <div className="mb-1 text-center">
            <div className="inline-flex items-center justify-center gap-2 sm:gap-3">
              <span
                className={cn(
                  "text-4xl sm:text-5xl",
                  scoreClass(primaryScore.home, primaryScore.away, "home", "lg")
                )}
              >
                {primaryScore.home}
              </span>
              <span className="font-display text-2xl font-bold text-accent/35 sm:text-3xl">-</span>
              <span
                className={cn(
                  "text-4xl sm:text-5xl",
                  scoreClass(primaryScore.home, primaryScore.away, "away", "lg")
                )}
              >
                {primaryScore.away}
              </span>
            </div>
            {(clock.period === "half_time" || clock.period === "full_time") && (
              <p className="mt-1 font-display text-base font-semibold text-accent">
                {clock.period === "half_time" ? "Halftime" : "Full time"}
              </p>
            )}
            {setScore && (
              <p className="mt-0.5 font-display text-sm font-bold tabular-nums opacity-70">
                {config.setScoreLabel}: {setScore.home}-{setScore.away}
              </p>
            )}
          </div>
        )}

        {config.showRunningClock &&
        clock.period !== "half_time" &&
        clock.period !== "full_time" ? (
          <div className="mb-3 text-center">
            <div className="inline-flex items-center justify-center gap-2">
              <span className="font-mono text-3xl font-bold tabular-nums sm:text-4xl">
                {formatTime()}
              </span>
              {sport === "football" &&
                (clock.inStoppagePhase || clock.boardedStoppageMinutes > 0) && (
                  <span className="btn-filled rounded-full px-2.5 py-0.5 font-display text-sm font-extrabold tabular-nums">
                    +{Math.max(1, clock.boardedStoppageMinutes || 0)}
                  </span>
                )}
            </div>
            {sport === "football" && (clock.inStoppagePhase || clock.isTimeLost) && (
              <p className="mt-1 font-mono text-lg font-bold tabular-nums text-accent">
                Stoppage {formatStoppageTime()}
              </p>
            )}
            {config.showPeriodBadge && (
              <p className="mt-1 font-display text-xs font-bold uppercase tracking-wide text-accent/55">
                {periodLabel}
                {clock.inStoppagePhase ? " · stoppage" : ""}
              </p>
            )}
            {sport === "football" && loggingEnabled && (
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {clock.period === "half_1" && clock.atRegulation && (
                  <button
                    type="button"
                    onClick={() => void handleEnterHalfTime()}
                    className="btn-filled rounded-lg px-3 py-1.5 font-display text-xs font-bold"
                  >
                    End stoppage → Halftime
                  </button>
                )}
                {clock.period === "half_2" && clock.atRegulation && (
                  <button
                    type="button"
                    onClick={() => void handleEnterFullTime()}
                    className="btn-filled rounded-lg px-3 py-1.5 font-display text-xs font-bold"
                  >
                    End stoppage → Full time
                  </button>
                )}
              </div>
            )}
          </div>
        ) : config.showRunningClock &&
          (clock.period === "half_time" || clock.period === "full_time") ? (
          <div className="mb-3 text-center">
            {clock.period === "half_time" && loggingEnabled && (
              <button
                type="button"
                onClick={() => void handleStartSecondHalf()}
                className="btn-filled rounded-lg px-4 py-2 font-display text-sm font-bold"
              >
                Start 2nd half
              </button>
            )}
          </div>
        ) : !config.showRunningClock ? (
          <div className="mb-3 text-center">
            <span className="font-display text-lg font-extrabold">{match.home_team?.name}</span>
            {config.showPeriodBadge && (
              <p className="mt-1 font-display text-xs font-bold uppercase tracking-wide text-accent/55">
                {periodLabel}
              </p>
            )}
          </div>
        ) : null}

        {config.showClockToggles &&
          clock.period !== "half_time" &&
          clock.period !== "full_time" && (
          <div className="mx-auto max-w-md">
            <MatchClockControls
              variant={clockVariant}
              size={sport === "football" ? "lg" : "md"}
              isRunning={clock.isRunning}
              isTimeLost={clock.isTimeLost || Boolean(clock.inStoppagePhase)}
              disabled={!loggingEnabled}
              onStop={() => setRunning(false)}
              onResume={() => setRunning(true)}
              onPlaying={() => {
                if (!clock.isRunning && !clock.atRegulation) setRunning(true);
              }}
              onTimeLost={() => setTimeLost(!clock.isTimeLost)}
              clockOnLabel={config.clockOnLabel}
              clockOffLabel={config.clockOffLabel}
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

      {startError && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm font-semibold text-red-800">
          {startError}
        </p>
      )}

      {!loggingEnabled && lifecycle.isScheduled && (
        <p className="mb-4 rounded-lg bg-surface px-3 py-2 text-center text-sm font-semibold opacity-70">
          Start the match to begin logging events.
        </p>
      )}

      {loggingEnabled && (
        <section className="mb-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-display text-xs font-extrabold uppercase tracking-wide opacity-50">
              {config.logSectionLabel}
            </h2>
            <NameModeToggle />
          </div>
          <KeeperEventTimeline
            logs={logs}
            onRemove={handleRemove}
            onDisallow={sport === "football" ? disallowGoal : undefined}
            nameFor={nameFor}
          />
        </section>
      )}

      {loggingEnabled && subBatch && (
        <div className="mb-4 rounded-xl border border-accent/30 bg-accent/5 p-4">
          <p className="mb-1 text-center font-display text-sm font-bold">
            {subBatch.phase === "pick_in"
              ? "Tap player coming on"
              : subBatch.pairs.length >= subsLeftFor(subBatch.side)
                ? `Max ${maxSubs} subs — confirm batch`
                : "Confirm, or tap another player going off"}
          </p>
          <p className="mb-3 text-center text-xs opacity-60">
            {subsLeftFor(subBatch.side)} of {maxSubs} subs left · one timeline event per pair
          </p>
          {subNotice && (
            <p className="mb-3 rounded-md bg-amber-50 px-2 py-1.5 text-center text-xs font-semibold text-amber-800">
              {subNotice}
            </p>
          )}
          <ul className="mb-3 space-y-1.5">
            {subBatch.pairs.map((pair, i) => (
              <li
                key={`sub-pair-${pair.outId}-${i}`}
                className="rounded-lg border border-rule bg-white px-3 py-2 text-center font-display text-xs font-bold"
              >
                {pair.outName}
                <span className="mx-1.5 opacity-40">→</span>
                {pair.inName ?? (
                  <span className="font-semibold text-accent/50">select on</span>
                )}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={confirmSubBatch}
              disabled={!subBatch.pairs.some((p) => p.inId)}
              className="btn-primary rounded-lg px-4 py-2 font-display text-sm font-bold disabled:opacity-40"
            >
              Confirm {subBatch.pairs.filter((p) => p.inId).length || ""} sub
              {subBatch.pairs.filter((p) => p.inId).length === 1 ? "" : "s"}
            </button>
            <button
              type="button"
              onClick={() => setSubBatch(null)}
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
          <p className="mb-3 text-center text-xs text-accent/60">
            Pick an assister, or mark Solo if nobody assisted. Required before the next goal.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {assistSquad.map((p) => (
              <button
                key={`assist-${p.id}-${p.jersey_number ?? ""}`}
                type="button"
                onClick={() => addAssist(p.id)}
                className="interactive-btn rounded-lg border border-rule bg-white px-3 py-2 font-display text-xs font-bold"
              >
                {p.jersey_number != null && <span className="mr-1 opacity-50">#{p.jersey_number}</span>}
                {playerDisplayName(p, nameMode)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => markSoloGoal()}
              className="interactive-btn rounded-lg border border-[#004e28]/40 bg-white px-3 py-2 font-display text-xs font-bold text-[#004e28]"
            >
              Solo goal
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

      {loggingEnabled && !subBatch && subNotice && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-center text-sm font-semibold text-amber-800">
          {subNotice}
        </p>
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
          subMode={subBatch?.side === "home" ? subBatch.phase : null}
          appliedSubs={homeSubPairs}
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
            subMode={subBatch?.side === "home" ? subBatch.phase : null}
            appliedSubs={homeSubPairs}
            subsLeft={subsLeftFor("home")}
            onQuickSub={(id) => startSub("home", id, playerMeta("home", id).player_name)}
          />
          <KeeperRosterColumn
            team={match.away_team}
            players={awaySquad}
            selectedPlayerId={selected?.side === "away" ? selected.playerId : null}
            onSelectPlayer={(id) => selectPlayer("away", id)}
            teamQuickActions={config.teamQuickActions}
            onTeamQuickAction={(action) => logTeamQuickAction("away", action)}
            subMode={subBatch?.side === "away" ? subBatch.phase : null}
            appliedSubs={awaySubPairs}
            subsLeft={subsLeftFor("away")}
            onQuickSub={(id) => startSub("away", id, playerMeta("away", id).player_name)}
          />
        </div>
      ))}

      {loggingEnabled && selected && selectedPlayer && (
        <div className="mt-4">
          <KeeperActionBar
            playerName={playerDisplayName(selectedPlayer, nameMode)}
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
