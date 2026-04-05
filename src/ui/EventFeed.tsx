import { useEffect, useState } from "react";
import { useGameStore } from "../store/gameStore";
import type { SimEvent, Team } from "../game/types";

interface FeedEntry {
  id: number;
  message: string;
  kind: "score" | "miss" | "turnover" | "info" | "foul" | "sub";
  teamColor?: string;
}

const MAX_ENTRIES = 6;
let nextEntryId = 0;

// Icon prefix for each event kind
const KIND_ICON: Record<FeedEntry["kind"], string> = {
  score:    "🏀",
  miss:     "·",
  turnover: "↺",
  info:     "●",
  foul:     "!",
  sub:      "⇄",
};

const KIND_STYLES: Record<FeedEntry["kind"], { text: string; bg: string; border: string }> = {
  score:    { text: "text-white font-semibold",  bg: "rgba(6,10,20,0.88)",  border: "transparent" },
  miss:     { text: "text-white/50",              bg: "rgba(6,6,12,0.75)",  border: "transparent" },
  turnover: { text: "text-amber-300",             bg: "rgba(8,7,4,0.80)",   border: "rgba(245,158,11,0.18)" },
  info:     { text: "text-sky-300",               bg: "rgba(4,8,14,0.80)",  border: "rgba(56,189,248,0.20)" },
  foul:     { text: "text-orange-400",            bg: "rgba(10,6,4,0.80)",  border: "rgba(251,146,60,0.22)" },
  sub:      { text: "text-fuchsia-300",           bg: "rgba(8,4,12,0.80)",  border: "rgba(240,171,252,0.20)" },
};

function resolveTeam(teamId: string | undefined, homeTeam: Team, awayTeam: Team): Team | null {
  if (!teamId) return null;
  if (teamId === "home" || teamId === homeTeam.id) return homeTeam;
  if (teamId === "away" || teamId === awayTeam.id) return awayTeam;
  return null;
}

function toFeedEntry(event: SimEvent, homeTeam: Team, awayTeam: Team): FeedEntry | null {
  const team   = resolveTeam(event.teamId, homeTeam, awayTeam);
  const prefix = team ? `${team.abbreviation}: ` : "";

  switch (event.type) {
    case "shot_made":
    case "free_throw_made":
      return {
        id: nextEntryId++,
        message: `${prefix}${event.message}`,
        kind: "score",
        teamColor: team?.primaryColor,
      };
    case "shot_missed":
    case "free_throw_missed":
    case "rebound":
    case "block":
      return { id: nextEntryId++, message: `${prefix}${event.message}`, kind: "miss" };
    case "steal":
    case "turnover":
    case "shot_clock_violation":
      return { id: nextEntryId++, message: `${prefix}${event.message}`, kind: "turnover" };
    case "foul":
    case "non_shooting_foul":
      return { id: nextEntryId++, message: `${prefix}${event.message}`, kind: "foul" };
    case "substitution":
      return { id: nextEntryId++, message: `${prefix}${event.message}`, kind: "sub" };
    case "half_end":
    case "game_end":
      return { id: nextEntryId++, message: event.message, kind: "info" };
    case "possession_change":
      if (
        event.message === "GET READY!" ||
        event.message === "TIP OFF!" ||
        event.message === "2nd HALF START!"
      ) {
        return { id: nextEntryId++, message: event.message, kind: "info" };
      }
      return null;
    case "pass":
    default:
      return null;
  }
}

export default function EventFeed() {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const simStatus    = useGameStore((s) => s.simStatus);
  const phase        = useGameStore((s) => s.phase);
  const homeTeam     = useGameStore((s) => s.homeTeam);
  const awayTeam     = useGameStore((s) => s.awayTeam);
  const latestEvents = useGameStore((s) => s.latestEvents);

  useEffect(() => {
    if (simStatus === "running" && phase === "PRE_GAME") {
      setEntries([]);
    }
  }, [simStatus, phase]);

  useEffect(() => {
    if (latestEvents.length === 0) return;

    const nextEntries = latestEvents
      .map((event) => toFeedEntry(event, homeTeam, awayTeam))
      .filter((entry): entry is FeedEntry => entry !== null)
      .reverse();

    if (nextEntries.length === 0) return;

    setEntries((prev) => [...nextEntries, ...prev].slice(0, MAX_ENTRIES));
  }, [latestEvents, homeTeam, awayTeam]);

  if (entries.length === 0) return null;

  return (
    <div className="absolute right-[max(0.75rem,env(safe-area-inset-right,0px))] top-[max(5.5rem,calc(env(safe-area-inset-top,0px)+4.5rem))] z-20 flex select-none flex-col items-end gap-1.5">
      {entries.map((entry, index) => {
        const styles  = KIND_STYLES[entry.kind];
        const icon    = KIND_ICON[entry.kind];
        const opacity = Math.max(0.22, 1 - index * 0.16);
        const isScore = entry.kind === "score";

        return (
          <div
            key={entry.id}
            className={`feed-entry flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs shadow-lg backdrop-blur-sm ${styles.text}`}
            style={{
              background: styles.bg,
              borderLeft: isScore
                ? `3px solid ${entry.teamColor ?? "white"}`
                : `3px solid ${styles.border}`,
              opacity,
              boxShadow: isScore && entry.teamColor
                ? `0 2px 12px rgba(0,0,0,0.4), inset 0 0 8px ${entry.teamColor}18`
                : "0 2px 8px rgba(0,0,0,0.35)",
            }}
          >
            <span
              className="text-[10px] leading-none opacity-70 shrink-0"
              style={isScore && entry.teamColor ? { color: entry.teamColor } : undefined}
            >
              {icon}
            </span>
            <span className="leading-tight">{entry.message}</span>
          </div>
        );
      })}
    </div>
  );
}
