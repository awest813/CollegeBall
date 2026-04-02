import { useGameStore } from "../store/gameStore";
import type { CameraMode, GameSpeed } from "../game/types";

const SPEEDS: GameSpeed[] = [1, 2, 4];

const CAMERA_MODES: { mode: CameraMode; label: string; title: string }[] = [
  { mode: "broadcast", label: "TV", title: "Broadcast sideline angle" },
  { mode: "overhead", label: "Sky", title: "Overhead tactical view" },
  { mode: "endzone", label: "Rim", title: "Behind-the-basket angle" },
];

export default function GameControls() {
  const simStatus = useGameStore((s) => s.simStatus);
  const gameSpeed = useGameStore((s) => s.gameSpeed);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const isPauseMenuOpen = useGameStore((s) => s.isPauseMenuOpen);
  const setSimStatus = useGameStore((s) => s.setSimStatus);
  const setGameSpeed = useGameStore((s) => s.setGameSpeed);
  const setCameraMode = useGameStore((s) => s.setCameraMode);
  const openPauseMenu = useGameStore((s) => s.openPauseMenu);

  const isPlayable = simStatus === "running" || simStatus === "paused";
  const isFinished = simStatus === "finished";

  const togglePause = () => {
    if (simStatus === "running") {
      setSimStatus("paused");
      return;
    }

    if (simStatus === "paused") {
      setSimStatus("running");
    }
  };

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 select-none px-4 pb-4 sm:px-6 sm:pb-5">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 rounded-[28px] border border-white/10 bg-slate-950/68 px-4 py-3 shadow-2xl backdrop-blur-xl sm:px-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/45">
            <span className="rounded-full border border-white/10 px-2 py-1 text-[9px] text-white/55">
              Bench Command
            </span>
            <span>{isPauseMenuOpen ? "Menu Open" : "Live Control"}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={togglePause}
              disabled={!isPlayable || isPauseMenuOpen}
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-35"
              title={simStatus === "running" ? "Pause simulation" : "Resume simulation"}
            >
              {simStatus === "running" ? "Pause" : "Resume"}
            </button>

            <button
              onClick={() => void window.toggleCollegeBallFullscreen?.()}
              disabled={!isPlayable || isFinished}
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-35"
              title="Toggle fullscreen"
            >
              Fullscreen
            </button>

            <button
              onClick={openPauseMenu}
              disabled={!isPlayable || isFinished}
              className="rounded-full bg-amber-300 px-4 py-2 text-sm font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-35"
            >
              Game Menu
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[22px] border border-white/8 bg-white/[0.04] px-3 py-3 backdrop-blur-sm">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/40">
              Camera Deck
            </div>
            <div className="flex flex-wrap gap-2">
              {CAMERA_MODES.map(({ mode, label, title }) => (
                <button
                  key={mode}
                  onClick={() => setCameraMode(mode)}
                  title={title}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    cameraMode === mode
                      ? "bg-white text-slate-950 shadow-lg"
                      : "border border-white/10 bg-slate-950/55 text-white/65 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] border border-white/8 bg-white/[0.04] px-3 py-3 backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-[0.35em] text-white/40">
                Sim Pace
              </div>
              <div className="text-[11px] font-medium text-white/35">
                Esc menu | F fullscreen
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {SPEEDS.map((speed) => (
                <button
                  key={speed}
                  onClick={() => setGameSpeed(speed)}
                  disabled={isFinished}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-35 ${
                    gameSpeed === speed
                      ? "bg-cyan-300 text-slate-950 shadow-lg"
                      : "border border-white/10 bg-slate-950/55 text-white/65 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
