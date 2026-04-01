/**
 * Scoreboard HUD – displays score, clocks, possession, and game controls.
 * Styled with Tailwind for a clean broadcast-inspired look.
 */

import { useGameStore } from "../store/gameStore";

/** Format seconds → "MM:SS" */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Scoreboard() {
  const score = useGameStore((s) => s.score);
  const gameClock = useGameStore((s) => s.gameClock);
  const shotClock = useGameStore((s) => s.shotClock);
  const possession = useGameStore((s) => s.possession);
  const homeTeam = useGameStore((s) => s.homeTeam);
  const awayTeam = useGameStore((s) => s.awayTeam);
  const simStatus = useGameStore((s) => s.simStatus);

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 select-none">
      <div className="flex items-center gap-1 bg-black/80 rounded-lg overflow-hidden shadow-lg border border-white/10">
        {/* Home team */}
        <div className="flex items-center gap-2 px-4 py-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: homeTeam.primaryColor }}
          />
          <span className="text-white font-bold text-sm tracking-wide">
            {homeTeam.abbreviation}
          </span>
          {possession.team === "home" && (
            <span className="text-yellow-400 text-xs">●</span>
          )}
          <span className="text-white font-mono text-2xl font-bold ml-2">
            {score.home}
          </span>
        </div>

        {/* Centre: clocks */}
        <div className="flex flex-col items-center px-4 py-1 border-x border-white/10 min-w-[100px]">
          <span className="text-white font-mono text-xl font-bold">
            {formatTime(gameClock.remaining)}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs">
              {gameClock.half === 1 ? "1ST" : "2ND"}
            </span>
            <span className={`font-mono text-sm font-bold ${
              shotClock.remaining <= 5 ? "text-red-400" : "text-yellow-300"
            }`}>
              {Math.ceil(shotClock.remaining)}
            </span>
          </div>
          {simStatus === "finished" && (
            <span className="text-red-400 text-xs font-bold">FINAL</span>
          )}
        </div>

        {/* Away team */}
        <div className="flex items-center gap-2 px-4 py-2">
          <span className="text-white font-mono text-2xl font-bold mr-2">
            {score.away}
          </span>
          {possession.team === "away" && (
            <span className="text-yellow-400 text-xs">●</span>
          )}
          <span className="text-white font-bold text-sm tracking-wide">
            {awayTeam.abbreviation}
          </span>
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: awayTeam.primaryColor }}
          />
        </div>
      </div>
    </div>
  );
}
