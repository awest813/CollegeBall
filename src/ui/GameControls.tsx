/**
 * GameControls – play/pause and speed controls overlay.
 */

import { useGameStore } from "../store/gameStore";
import type { GameSpeed } from "../game/types";

const SPEEDS: GameSpeed[] = [1, 2, 4];

export default function GameControls() {
  const simStatus = useGameStore((s) => s.simStatus);
  const gameSpeed = useGameStore((s) => s.gameSpeed);
  const setSimStatus = useGameStore((s) => s.setSimStatus);
  const setGameSpeed = useGameStore((s) => s.setGameSpeed);

  const togglePause = () => {
    if (simStatus === "running") setSimStatus("paused");
    else if (simStatus === "paused") setSimStatus("running");
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 select-none">
      <div className="flex items-center gap-3 bg-black/80 rounded-lg px-4 py-2 shadow-lg border border-white/10">
        {/* Play / Pause */}
        <button
          onClick={togglePause}
          disabled={simStatus === "finished" || simStatus === "idle"}
          className="text-white hover:text-yellow-300 transition-colors disabled:opacity-40 text-xl font-bold px-2"
          title={simStatus === "running" ? "Pause" : "Play"}
        >
          {simStatus === "running" ? "⏸" : "▶"}
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-white/20" />

        {/* Speed */}
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => setGameSpeed(s)}
            className={`px-2 py-1 rounded text-sm font-bold transition-colors ${
              gameSpeed === s
                ? "bg-yellow-400 text-black"
                : "text-white/60 hover:text-white"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
