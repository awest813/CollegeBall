import { useEffect, useState } from "react";
import { useGameStore } from "../store/gameStore";
import type { SimEvent, Team } from "../game/types";

interface FeedEntry {
  id: number;
  message: string;
  kind: "score" | "miss" | "turnover" | "info" | "foul" | "sub";
  teamColor?: string;
}

const MAX_ENTRIES = 5;
const OPACITY_FADE_RATE = 0.18;
let nextEntryId = 0;

const KIND_STYLES: Record<FeedEntry["kind"], string> = {
  score: "border-l-2 text-white",
  miss: "text-white/55",
  turnover: "text-amber-300",
  info: "text-sky-300",
  foul: "text-orange-400",
  sub: "text-fuchsia-300",
};

function resolveTeam(teamId: string | undefined, homeTeam: Team, awayTeam: Team): Team | null {
  if (!teamId) {
    return null;
  }
  if (teamId === "home" || teamId === homeTeam.id) {
    return homeTeam;
  }
  if (teamId === "away" || teamId === awayTeam.id) {
    return awayTeam;
  }
  return null;
}

function toFeedEntry(event: SimEvent, homeTeam: Team, awayTeam: Team): FeedEntry | null {
  const team = resolveTeam(event.teamId, homeTeam, awayTeam);
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
      return {
        id: nextEntryId++,
        message: `${prefix}${event.message}`,
        kind: "miss",
      };
    case "steal":
    case "turnover":
    case "shot_clock_violation":
      return {
        id: nextEntryId++,
        message: `${prefix}${event.message}`,
        kind: "turnover",
      };
    case "foul":
    case "non_shooting_foul":
      return {
        id: nextEntryId++,
        message: `${prefix}${event.message}`,
        kind: "foul",
      };
    case "substitution":
      return {
        id: nextEntryId++,
        message: `${prefix}${event.message}`,
        kind: "sub",
      };
    case "half_end":
    case "game_end":
      return {
        id: nextEntryId++,
        message: event.message,
        kind: "info",
      };
    case "possession_change":
      if (
        event.message === "GET READY!" ||
        event.message === "TIP OFF!" ||
        event.message === "2nd HALF START!"
      ) {
        return {
          id: nextEntryId++,
          message: event.message,
          kind: "info",
        };
      }
      return null;
    case "pass":
    default:
      return null;
  }
}

export default function EventFeed() {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const simStatus = useGameStore((s) => s.simStatus);
  const phase = useGameStore((s) => s.phase);
  const homeTeam = useGameStore((s) => s.homeTeam);
  const awayTeam = useGameStore((s) => s.awayTeam);
  const latestEvents = useGameStore((s) => s.latestEvents);

  useEffect(() => {
    if (simStatus === "running" && phase === "PRE_GAME") {
      setEntries([]);
    }
  }, [simStatus, phase]);

  useEffect(() => {
    if (latestEvents.length === 0) {
      return;
    }

    const nextEntries = latestEvents
      .map((event) => toFeedEntry(event, homeTeam, awayTeam))
      .filter((entry): entry is FeedEntry => entry !== null)
      .reverse();

    if (nextEntries.length === 0) {
      return;
    }

    setEntries((prev) => [...nextEntries, ...prev].slice(0, MAX_ENTRIES));
  }, [latestEvents, homeTeam, awayTeam]);

  if (entries.length === 0) return null;

  return (
    <div className="absolute right-4 top-[88px] z-20 flex select-none flex-col items-end gap-1.5">
      {entries.map((entry, index) => (
        <div
          key={entry.id}
          className={`rounded-xl px-3 py-1.5 text-xs shadow-md backdrop-blur-sm transition-all ${KIND_STYLES[entry.kind]}`}
          style={{
            background: "rgba(6,6,12,0.82)",
            borderColor: entry.kind === "score" ? (entry.teamColor ?? "white") : "transparent",
            opacity: Math.max(0.3, 1 - index * OPACITY_FADE_RATE),
          }}
        >
          {entry.message}
        </div>
      ))}
    </div>
  );
}
