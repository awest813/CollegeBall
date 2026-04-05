import { useGameStore } from "../store/gameStore";

export default function MatchPhaseOverlay() {
  const phase          = useGameStore((s) => s.phase);
  const simStatus      = useGameStore((s) => s.simStatus);
  const homeTeam       = useGameStore((s) => s.homeTeam);
  const awayTeam       = useGameStore((s) => s.awayTeam);
  const score          = useGameStore((s) => s.score);
  const overtimePeriod = useGameStore((s) => s.overtimePeriod);

  if (simStatus !== "running" && phase !== "FULL_TIME" && phase !== "FINISHED") return null;
  if (phase === "IN_PLAY" || phase === "FINISHED") return null;

  let title    = "";
  let subtitle = "";
  let accent   = "#f5d46b"; // default gold

  switch (phase) {
    case "PRE_GAME":
      title    = "MATCH PREPARATION";
      subtitle = "Warm-ups in progress";
      accent   = "#64748b";
      break;
    case "TIP_OFF":
      title    = "TIP OFF";
      subtitle = "Jump ball — game begins";
      accent   = "#f5d46b";
      break;
    case "HALFTIME":
      title    = "HALFTIME";
      subtitle = "Teams switching sides";
      accent   = "#38bdf8";
      break;
    case "OVERTIME": {
      title    = overtimePeriod === 1 ? "OVERTIME" : `OT${overtimePeriod}`;
      subtitle = "Game tied — extra period!";
      accent   = "#f97316"; // orange for urgency
      break;
    }
    case "FULL_TIME": {
      const homeWon = score.home > score.away;
      const awayWon = score.away > score.home;
      title    = "FINAL";
      subtitle = homeWon
        ? `${homeTeam.name} wins!`
        : awayWon
          ? `${awayTeam.name} wins!`
          : "It's a tie!";
      accent = homeWon
        ? homeTeam.primaryColor
        : awayWon
          ? awayTeam.primaryColor
          : "#a0a0a0";
      break;
    }
    default:
      return null;
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none select-none">
      <div
        className="px-14 py-10 rounded-3xl flex flex-col items-center polish-rise"
        style={{
          background: "rgba(4,6,14,0.88)",
          backdropFilter: "blur(16px)",
          border: `1px solid ${accent}28`,
          boxShadow: `0 0 60px ${accent}18, 0 8px 40px rgba(0,0,0,0.6)`,
        }}
      >
        {/* Accent line */}
        <div
          className="h-1 rounded-full mb-5 polish-glow"
          style={{ width: 52, backgroundColor: accent, boxShadow: `0 0 12px ${accent}` }}
        />

        {/* Main title */}
        <h2
          className="text-5xl font-black tracking-tighter uppercase mb-2 italic"
          style={{ color: "white", textShadow: `0 0 40px ${accent}60, 0 2px 4px rgba(0,0,0,0.8)` }}
        >
          {title}
        </h2>

        {/* Subtitle with accent colour */}
        <p
          className="text-sm font-bold tracking-[0.20em] uppercase"
          style={{ color: accent, opacity: 0.90 }}
        >
          {subtitle}
        </p>

        {/* Score hint for halftime / overtime / full time */}
        {(phase === "HALFTIME" || phase === "OVERTIME" || phase === "FULL_TIME") && (
          <div className="mt-5 flex items-center gap-4">
            <span className="font-mono text-3xl font-black text-white tabular-nums">
              {score.home}
            </span>
            <span
              className="w-6 h-px"
              style={{ backgroundColor: accent, opacity: 0.6 }}
            />
            <span className="font-mono text-3xl font-black text-white tabular-nums">
              {score.away}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
