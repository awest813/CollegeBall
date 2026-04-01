/**
 * EventFeed – shows recent simulation events (baskets, turnovers, etc.)
 *
 * Events are colour-coded by type for instant readability:
 *   scored  → team primary color accent
 *   missed  → grey / muted
 *   turnover → amber
 */

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../store/gameStore";

interface FeedEntry {
  id: number;
  message: string;
  kind: "score" | "miss" | "turnover" | "info" | "foul" | "sub";
  teamColor?: string;
}

const MAX_ENTRIES = 5;
/** Opacity reduction per older entry position (0.18 = each older item is 18% more transparent). */
const OPACITY_FADE_RATE = 0.18;
let _entryId = 0;

const KIND_STYLES: Record<FeedEntry["kind"], string> = {
  score: "border-l-2 text-white",
  miss: "text-white/55",
  turnover: "text-amber-300",
  info: "text-sky-300",
  foul: "text-orange-400",
  sub: "text-purple-300",
};

export default function EventFeed() {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  // Avoid stale-closure issues by storing the latest teams in a ref
  const homeTeamRef = useRef(useGameStore.getState().homeTeam);
  const awayTeamRef = useRef(useGameStore.getState().awayTeam);

  useEffect(() => {
    const unsub = useGameStore.subscribe((state) => {
      homeTeamRef.current = state.homeTeam;
      awayTeamRef.current = state.awayTeam;
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = useGameStore.subscribe((state, prev) => {
      const homeTeam = homeTeamRef.current;
      const awayTeam = awayTeamRef.current;
      const newEntries: FeedEntry[] = [];

      // Score change → basket scored
      if (state.score.home !== prev.score.home) {
        const pts = state.score.home - prev.score.home;
        newEntries.push({
          id: _entryId++,
          message: `${homeTeam.abbreviation} +${pts} (${state.score.home})`,
          kind: "score",
          teamColor: homeTeam.primaryColor,
        });
      }
      if (state.score.away !== prev.score.away) {
        const pts = state.score.away - prev.score.away;
        newEntries.push({
          id: _entryId++,
          message: `${awayTeam.abbreviation} +${pts} (${state.score.away})`,
          kind: "score",
          teamColor: awayTeam.primaryColor,
        });
      }

      // Team foul committed
      if (state.teamFouls.home !== prev.teamFouls.home) {
        newEntries.push({
          id: _entryId++,
          message: `${homeTeam.abbreviation} foul (${state.teamFouls.home})`,
          kind: "foul",
        });
      }
      if (state.teamFouls.away !== prev.teamFouls.away) {
        newEntries.push({
          id: _entryId++,
          message: `${awayTeam.abbreviation} foul (${state.teamFouls.away})`,
          kind: "foul",
        });
      }

      // Possession change with no score → turnover / rebound
      if (
        state.possession.team !== prev.possession.team &&
        state.score.home === prev.score.home &&
        state.score.away === prev.score.away
      ) {
        const team =
          state.possession.team === "home" ? homeTeam : awayTeam;
        newEntries.push({
          id: _entryId++,
          message: `${team.abbreviation} ball`,
          kind: "turnover",
        });
      }

      // Substitution: detect when a player on court is replaced
      if (state.simPlayers.length === prev.simPlayers.length) {
        const prevIds = new Set(prev.simPlayers.map((p) => p.id));
        for (const p of state.simPlayers) {
          if (!prevIds.has(p.id)) {
            const team = p.teamId === "home" ? homeTeam : awayTeam;
            newEntries.push({
              id: _entryId++,
              message: `${team.abbreviation} sub`,
              kind: "sub",
            });
            break; // one entry per tick is enough
          }
        }
      }

      if (newEntries.length > 0) {
        setEntries((prev) =>
          [...newEntries, ...prev].slice(0, MAX_ENTRIES)
        );
      }
    });
    return unsub;
  }, []);

  if (entries.length === 0) return null;

  return (
    <div className="absolute top-[72px] right-4 z-20 select-none flex flex-col gap-1 items-end">
      {entries.map((e, i) => (
        <div
          key={e.id}
          className={`text-xs px-3 py-1 rounded-lg shadow-md backdrop-blur-sm transition-all ${KIND_STYLES[e.kind]}`}
          style={{
            background: "rgba(6,6,12,0.82)",
            borderColor: e.kind === "score" ? (e.teamColor ?? "white") : "transparent",
            opacity: Math.max(0.3, 1 - i * OPACITY_FADE_RATE),
          }}
        >
          {e.message}
        </div>
      ))}
    </div>
  );
}
