import type { ReactNode } from "react";
import {
  ArrowLeftRight,
  CircleDot,
  CornerDownRight,
  Flag,
  Hand,
  Plus,
  Target,
  Timer,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";
import { GiSoccerBall } from "react-icons/gi";
import type { KeeperLogEntry } from "@/lib/keeper/keeper-events";
import type { SportId } from "@/lib/utils/sport";

export interface KeeperActionDef {
  id: string;
  label: string;
  icon: ReactNode;
}

export interface KeeperFoulChip {
  id: string;
  label: string;
  className: string;
}

export interface KeeperTeamQuickAction {
  id: string;
  label: string;
  icon: ReactNode;
  eventType: string;
  /** Team-level log — no player required */
  teamOnly?: boolean;
}

export interface KeeperSportConfig {
  layout: "split" | "single";
  /** Primary score in header (goals, points, sets) */
  showPrimaryScore: boolean;
  primaryScoreLabel: string;
  /** e.g. volleyball rally points in current set */
  showSetScore: boolean;
  setScoreLabel: string;
  /** Running M:SS clock from match clock */
  showRunningClock: boolean;
  /** Playing / time lost or clock on/off */
  showClockToggles: boolean;
  clockOnLabel: string;
  clockOffLabel: string;
  /** Show match period e.g. Q3, Set 4 */
  showPeriodBadge: boolean;
  assistAfter: string[];
  assistPromptLabel: string;
  foulSectionLabel: string;
  logSectionLabel: string;
  playerActions: KeeperActionDef[];
  foulChips: KeeperFoulChip[];
  teamQuickActions: KeeperTeamQuickAction[];
  /** Prompt for time after finish (track) */
  promptFinishTime: boolean;
  computePrimaryScore: (
    logs: KeeperLogEntry[],
    homeTeamId: string,
    awayTeamId: string
  ) => { home: number; away: number };
  computeSetScore?: (
    logs: KeeperLogEntry[],
    homeTeamId: string,
    awayTeamId: string,
    currentPeriod: string
  ) => { home: number; away: number };
}

function footballPrimaryScore(logs: KeeperLogEntry[], homeTeamId: string, awayTeamId: string) {
  let home = 0;
  let away = 0;
  for (const log of logs) {
    // Shootout pens are tracked separately — don't inflate FT score.
    if (log.period === "penalty_shootout") continue;
    if (log.event_type !== "goal" && log.event_type !== "penalty_scored") continue;
    if (log.team_id === homeTeamId) home++;
    else if (log.team_id === awayTeamId) away++;
  }
  return { home, away };
}

export function footballShootoutScore(
  logs: KeeperLogEntry[],
  homeTeamId: string,
  awayTeamId: string
) {
  let home = 0;
  let away = 0;
  for (const log of logs) {
    if (log.period !== "penalty_shootout") continue;
    if (log.event_type !== "penalty_scored") continue;
    if (log.team_id === homeTeamId) home++;
    else if (log.team_id === awayTeamId) away++;
  }
  return { home, away };
}

function basketballPrimaryScore(logs: KeeperLogEntry[], homeTeamId: string, awayTeamId: string) {
  let home = 0;
  let away = 0;
  for (const log of logs) {
    let pts = 0;
    if (log.event_type === "two_pointer") pts = 2;
    else if (log.event_type === "field_goal") pts = 3;
    else if (log.event_type === "free_throw") pts = 1;
    else continue;
    if (log.team_id === homeTeamId) home += pts;
    else if (log.team_id === awayTeamId) away += pts;
  }
  return { home, away };
}

function setsWonScore(logs: KeeperLogEntry[], homeTeamId: string, awayTeamId: string) {
  let home = 0;
  let away = 0;
  for (const log of logs) {
    if (log.event_type !== "set_won") continue;
    if (log.team_id === homeTeamId) home++;
    else if (log.team_id === awayTeamId) away++;
  }
  return { home, away };
}

function volleyballSetRallyScore(
  logs: KeeperLogEntry[],
  homeTeamId: string,
  awayTeamId: string,
  currentPeriod: string
) {
  let home = 0;
  let away = 0;
  for (const log of logs) {
    if (log.event_type !== "point_won") continue;
    if (log.period !== currentPeriod) continue;
    if (log.team_id === homeTeamId) home++;
    else if (log.team_id === awayTeamId) away++;
  }
  return { home, away };
}

const CARD_CHIPS: KeeperFoulChip[] = [
  { id: "yellow_card", label: "Yellow", className: "bg-yellow-400 text-yellow-950 border-yellow-500" },
  { id: "red_card", label: "Red", className: "bg-red-600 text-white border-red-700" },
  { id: "warning", label: "Warn", className: "bg-amber-200 text-amber-950 border-amber-400" },
];

const BASKETBALL_FOUL_CHIPS: KeeperFoulChip[] = [
  { id: "foul_personal", label: "Personal", className: "bg-yellow-400 text-yellow-950 border-yellow-500" },
  { id: "foul_technical", label: "Technical", className: "bg-red-600 text-white border-red-700" },
  { id: "warning", label: "Warn", className: "bg-amber-200 text-amber-950 border-amber-400" },
];

const CONFIG: Record<SportId, KeeperSportConfig> = {
  football: {
    layout: "split",
    showPrimaryScore: true,
    primaryScoreLabel: "Goals",
    showSetScore: false,
    setScoreLabel: "",
    showRunningClock: true,
    showClockToggles: true,
    clockOnLabel: "Playing",
    clockOffLabel: "Time lost",
    showPeriodBadge: false,
    assistAfter: ["goal"],
    assistPromptLabel: "Add assist?",
    foulSectionLabel: "Foul / card",
    logSectionLabel: "Match log",
    playerActions: [
      { id: "goal", label: "Goal", icon: <GiSoccerBall className="h-5 w-5" /> },
      { id: "penalty_scored", label: "Pen ✓", icon: <CircleDot className="h-5 w-5" /> },
      { id: "penalty_missed", label: "Pen ✗", icon: <XCircle className="h-5 w-5" /> },
      { id: "offside", label: "Offside", icon: <Flag className="h-5 w-5" /> },
      { id: "save", label: "Save", icon: <Hand className="h-5 w-5" /> },
      { id: "substitution", label: "Sub", icon: <ArrowLeftRight className="h-5 w-5" /> },
    ],
    foulChips: CARD_CHIPS,
    teamQuickActions: [
      {
        id: "corner",
        label: "Corner",
        icon: <CornerDownRight className="h-3.5 w-3.5" />,
        eventType: "corner",
        teamOnly: true,
      },
    ],
    promptFinishTime: false,
    computePrimaryScore: footballPrimaryScore,
  },
  basketball: {
    layout: "split",
    showPrimaryScore: true,
    primaryScoreLabel: "Points",
    showSetScore: false,
    setScoreLabel: "",
    showRunningClock: true,
    showClockToggles: true,
    clockOnLabel: "Clock on",
    clockOffLabel: "Time out",
    showPeriodBadge: true,
    assistAfter: ["two_pointer", "field_goal"],
    assistPromptLabel: "Add assist?",
    foulSectionLabel: "Foul",
    logSectionLabel: "Game log",
    playerActions: [
      { id: "two_pointer", label: "+2", icon: <Target className="h-5 w-5" /> },
      { id: "field_goal", label: "+3", icon: <Zap className="h-5 w-5" /> },
      { id: "free_throw", label: "FT +1", icon: <CircleDot className="h-5 w-5" /> },
      { id: "free_throw_missed", label: "FT miss", icon: <XCircle className="h-5 w-5" /> },
      { id: "substitution", label: "Sub", icon: <ArrowLeftRight className="h-5 w-5" /> },
    ],
    foulChips: BASKETBALL_FOUL_CHIPS,
    teamQuickActions: [
      {
        id: "timeout",
        label: "Timeout",
        icon: <Timer className="h-3.5 w-3.5" />,
        eventType: "timeout",
        teamOnly: true,
      },
    ],
    promptFinishTime: false,
    computePrimaryScore: basketballPrimaryScore,
  },
  volleyball: {
    layout: "split",
    showPrimaryScore: true,
    primaryScoreLabel: "Sets",
    showSetScore: true,
    setScoreLabel: "This set",
    showRunningClock: false,
    showClockToggles: false,
    clockOnLabel: "",
    clockOffLabel: "",
    showPeriodBadge: true,
    assistAfter: [],
    assistPromptLabel: "",
    foulSectionLabel: "Violation",
    logSectionLabel: "Rally log",
    playerActions: [
      { id: "kill", label: "Kill", icon: <Zap className="h-5 w-5" /> },
      { id: "block", label: "Block", icon: <Hand className="h-5 w-5" /> },
      { id: "ace", label: "Ace", icon: <Trophy className="h-5 w-5" /> },
      { id: "error", label: "Error", icon: <XCircle className="h-5 w-5" /> },
      { id: "substitution", label: "Sub", icon: <ArrowLeftRight className="h-5 w-5" /> },
    ],
    foulChips: [
      { id: "warning", label: "Warn", className: "bg-amber-200 text-amber-950 border-amber-400" },
      { id: "yellow_card", label: "Yellow", className: "bg-yellow-400 text-yellow-950 border-yellow-500" },
      { id: "red_card", label: "Red", className: "bg-red-600 text-white border-red-700" },
    ],
    teamQuickActions: [
      {
        id: "point",
        label: "Point",
        icon: <Plus className="h-3.5 w-3.5" />,
        eventType: "point_won",
        teamOnly: true,
      },
      {
        id: "set_won",
        label: "Set won",
        icon: <Flag className="h-3.5 w-3.5" />,
        eventType: "set_won",
        teamOnly: true,
      },
      {
        id: "timeout",
        label: "Timeout",
        icon: <Timer className="h-3.5 w-3.5" />,
        eventType: "timeout",
        teamOnly: true,
      },
    ],
    promptFinishTime: false,
    computePrimaryScore: setsWonScore,
    computeSetScore: volleyballSetRallyScore,
  },
  tennis: {
    layout: "split",
    showPrimaryScore: true,
    primaryScoreLabel: "Sets",
    showSetScore: false,
    setScoreLabel: "",
    showRunningClock: false,
    showClockToggles: false,
    clockOnLabel: "",
    clockOffLabel: "",
    showPeriodBadge: true,
    assistAfter: [],
    assistPromptLabel: "",
    foulSectionLabel: "",
    logSectionLabel: "Point log",
    playerActions: [
      { id: "ace", label: "Ace", icon: <Zap className="h-5 w-5" /> },
      { id: "break_point_won", label: "Break", icon: <Trophy className="h-5 w-5" /> },
      { id: "fault", label: "Fault", icon: <XCircle className="h-5 w-5" /> },
      { id: "double_fault", label: "Dbl fault", icon: <XCircle className="h-5 w-5 text-red-600" /> },
      { id: "winner", label: "Winner", icon: <Target className="h-5 w-5" /> },
    ],
    foulChips: [],
    teamQuickActions: [
      {
        id: "game_won",
        label: "Game",
        icon: <Target className="h-3.5 w-3.5" />,
        eventType: "game_won",
        teamOnly: true,
      },
      {
        id: "set_won",
        label: "Set won",
        icon: <Flag className="h-3.5 w-3.5" />,
        eventType: "set_won",
        teamOnly: true,
      },
    ],
    promptFinishTime: false,
    computePrimaryScore: setsWonScore,
  },
  track: {
    layout: "single",
    showPrimaryScore: false,
    primaryScoreLabel: "",
    showSetScore: false,
    setScoreLabel: "",
    showRunningClock: false,
    showClockToggles: false,
    clockOnLabel: "",
    clockOffLabel: "",
    showPeriodBadge: true,
    assistAfter: [],
    assistPromptLabel: "",
    foulSectionLabel: "",
    logSectionLabel: "Race log",
    playerActions: [
      { id: "finish", label: "Finish", icon: <Flag className="h-5 w-5" /> },
      { id: "dnf", label: "DNF", icon: <XCircle className="h-5 w-5" /> },
      { id: "false_start", label: "False start", icon: <Timer className="h-5 w-5" /> },
    ],
    foulChips: [],
    teamQuickActions: [],
    promptFinishTime: true,
    computePrimaryScore: () => ({ home: 0, away: 0 }),
  },
};

export function getKeeperSportConfig(sport: SportId): KeeperSportConfig {
  return CONFIG[sport];
}
