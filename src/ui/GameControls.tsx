/**
 * GameControls – play/pause, speed controls, and camera mode toggle.
 * Styled with a broadcast-inspired control bar.
 */

import { useGameStore } from "../store/gameStore";
import type { GameSpeed, CameraMode } from "../game/types";

const SPEEDS: GameSpeed[] = [1, 2, 4];

const CAMERA_MODES: { mode: CameraMode; label: string; title: string }[] = [
  { mode: "broadcast", label: "📺", title: "Broadcast (side-court)" },
  { mode: "overhead",  label: "🦅", title: "Overhead (top-down)" },
  { mode: "endzone",   label: "🏀", title: "Endzone (behind basket)" },
];

export default function GameControls() {
  const simStatus   = useGameStore((s) => s.simStatus);
  const gameSpeed   = useGameStore((s) => s.gameSpeed);
  const cameraMode  = useGameStore((s) => s.cameraMode);
  const setSimStatus  = useGameStore((s) => s.setSimStatus);
  const setGameSpeed  = useGameStore((s) => s.setGameSpeed);
  const setCameraMode = useGameStore((s) => s.setCameraMode);

  const isPlayable = simStatus === "running" || simStatus === "paused";
  const isFinished = simStatus === "finished";

  const togglePause = () => {
    if (simStatus === "running") setSimStatus("paused");
    else if (simStatus === "paused") setSimStatus("running");
  };

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 select-none flex flex-col items-center gap-2">
      {/* ── Camera mode picker ───────────────────────────────────────── */}
      <div
        className="flex items-center gap-1 rounded-full px-3 py-1.5 shadow-lg"
        style={{
          background: "rgba(8,8,16,0.75)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <span className="text-gray-500 text-[10px] font-semibold tracking-widest uppercase mr-1">
          Cam
        </span>
        {CAMERA_MODES.map(({ mode, label, title }) => (
          <button
            key={mode}
            onClick={() => setCameraMode(mode)}
            title={title}
            className={`px-2.5 py-1 rounded-full text-sm transition-all ${
              cameraMode === mode
                ? "bg-white/20 text-white shadow"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Playback controls ────────────────────────────────────────── */}
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
      </div>
    </div>
  );
}

