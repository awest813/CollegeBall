import { useGameStore } from "../store/gameStore";

export default function MatchPhaseOverlay() {
  const phase = useGameStore((s) => s.phase);
  const simStatus = useGameStore((s) => s.simStatus);

  if (simStatus !== "running" && phase !== "FULL_TIME" && phase !== "FINISHED") return null;
  if (phase === "IN_PLAY" || phase === "FINISHED") return null;

  let title = "";
  let subtitle = "";

  switch (phase) {
    case "PRE_GAME":
      title = "MATCH PREPARATION";
      subtitle = "Warm-ups in progress...";
      break;
    case "TIP_OFF":
      title = "TIP OFF";
      subtitle = "Prepare for the jump ball";
      break;
    case "HALFTIME":
      title = "HALFTIME";
      subtitle = "Teams are switching sides";
      break;
    case "FULL_TIME":
      title = "FINAL";
      subtitle = "Final buzzer sounded — Game Over!";
      break;
    default:
      return null;
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none select-none">
      <div className="bg-black/60 backdrop-blur-md border border-white/10 px-12 py-8 rounded-3xl flex flex-col items-center animate-in fade-in zoom-in duration-500">
        <div className="w-12 h-1 bg-yellow-400 rounded-full mb-4 animate-pulse" />
        <h2 className="text-white text-4xl font-black tracking-tighter uppercase mb-1 italic">
          {title}
        </h2>
        <p className="text-gray-400 text-sm font-bold tracking-widest uppercase opacity-80">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
