/**
 * EventFeed – shows recent simulation events (baskets, turnovers, etc.)
 */

import { useEffect, useState } from "react";
import { useGameStore } from "../store/gameStore";
import type { SimEvent } from "../game/types";

const MAX_EVENTS = 6;

export default function EventFeed() {
  const [events, setEvents] = useState<SimEvent[]>([]);

  useEffect(() => {
    const unsub = useGameStore.subscribe((state, prevState) => {
      // Detect score changes as a proxy for meaningful events
      if (
        state.score.home !== prevState.score.home ||
        state.score.away !== prevState.score.away
      ) {
        const pts =
          state.score.home !== prevState.score.home
            ? state.score.home - prevState.score.home
            : state.score.away - prevState.score.away;
        const team =
          state.score.home !== prevState.score.home
            ? state.homeTeam.abbreviation
            : state.awayTeam.abbreviation;
        setEvents((prev) =>
          [
            {
              type: "shot_made" as const,
              message: `${team} scores ${pts}!`,
              points: pts,
            },
            ...prev,
          ].slice(0, MAX_EVENTS)
        );
      }
    });
    return unsub;
  }, []);

  if (events.length === 0) return null;

  return (
    <div className="absolute top-20 right-4 z-20 select-none space-y-1">
      {events.map((e, i) => (
        <div
          key={i}
          className="bg-black/70 text-white text-xs px-3 py-1 rounded shadow border border-white/10 animate-pulse"
          style={{ opacity: 1 - i * 0.12 }}
        >
          {e.message}
        </div>
      ))}
    </div>
  );
}
