/**
 * GameControls – play/pause and speed controls overlay.
 * Styled with a broadcast-inspired control bar.
 */

import { useGameStore } from "../store/gameStore";
import type { GameSpeed } from "../game/types";

const SPEEDS: GameSpeed[] = [1, 2, 4];

export default function GameControls() {
  const simStatus = useGameStore((s) => s.simStatus);
  const gameSpeed = useGameStore((s) => s.gameSpeed);
  const setSimStatus = useGameStore((s) => s.setSimStatus);
  const setGameSpeed = useGameStore((s) => s.setGameSpeed);
  const setScreen = useGameStore((s) => s.setScreen);

  const isPlayable = simStatus === "running" || simStatus === "paused";
  const isFinished = simStatus === "finished";

  const togglePause = () => {
    if (simStatus === "running") setSimStatus("paused");
    else if (simStatus === "paused") setSimStatus("running");
  };

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 select-none">
      <div
        className="flex items-center gap-2 rounded-full px-5 py-2.5 shadow-xl"
        style={{
          background: "rgba(8,8,16,0.88)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        {/* Play / Pause */}
        <button
          onClick={togglePause}
          disabled={!isPlayable}
          className="w-8 h-8 flex items-center justify-center rounded-full text-white hover:text-yellow-300 transition-colors disabled:opacity-30 text-lg"
          title={simStatus === "running" ? "Pause" : "Play"}
        >
          {simStatus === "running" ? "⏸" : "▶"}
        </button>

        <div className="w-px h-5 bg-white/15 mx-1" />

        {/* Speed buttons */}
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => setGameSpeed(s)}
            disabled={isFinished}
            className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider transition-all disabled:opacity-30 ${
              gameSpeed === s
                ? "bg-yellow-400 text-black shadow-md"
                : "text-white/50 hover:text-white"
            }`}
          >
            {s}×
          </button>
        ))}

        {isFinished && (
          <>
            <div className="w-px h-5 bg-white/15 mx-1" />
            <button
              onClick={() => setScreen("menu")}
              className="px-3 py-1 rounded-full text-xs font-bold tracking-wider text-white/70 hover:text-white transition-colors"
            >
              Menu
            </button>
          </>
        )}
      </div>
    </div>
  );
}
