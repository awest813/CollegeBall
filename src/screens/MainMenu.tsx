/**
 * MainMenu – the landing screen with matchup preview and game launch.
 *
 * Designed to feel like a polished sports game start screen:
 *   • Dark court-themed gradient background
 *   • Prominent team matchup cards
 *   • Clear primary action (Start Exhibition)
 *   • Placeholder slots for future game modes
 */

import { useGameStore } from "../store/gameStore";

export default function MainMenu() {
  const startExhibition = useGameStore((s) => s.startExhibition);
  const homeTeam = useGameStore((s) => s.homeTeam);
  const awayTeam = useGameStore((s) => s.awayTeam);

  return (
    <div
      className="w-screen h-screen flex flex-col items-center justify-center select-none overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, #1a2a40 0%, #0d1520 50%, #060a10 100%)",
      }}
    >
      {/* ── Decorative court lines ─────────────────────────────────── */}
      <CourtDecoration />

      {/* ── Logo ───────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center mb-10">
        <span className="text-6xl mb-3">🏀</span>
        <h1 className="text-5xl font-black text-white tracking-tight leading-none">
          CollegeBall
        </h1>
        <p className="text-gray-400 text-sm font-medium tracking-widest uppercase mt-2">
          College Basketball Coaching Simulator
        </p>
      </div>

      {/* ── Matchup card ───────────────────────────────────────────── */}
      <div
        className="relative z-10 flex items-center gap-0 rounded-2xl overflow-hidden shadow-2xl mb-10"
        style={{ border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <TeamCard team={homeTeam} side="home" />

        {/* Center vs */}
        <div
          className="flex flex-col items-center justify-center px-8 py-10 gap-1"
          style={{ background: "rgba(8,8,16,0.96)" }}
        >
          <span className="text-gray-600 text-xs font-semibold tracking-widest uppercase">
            Exhibition
          </span>
          <span className="text-white/30 text-3xl font-black">vs</span>
          <span className="text-gray-600 text-xs font-semibold tracking-widest uppercase">
            Game
          </span>
        </div>

        <TeamCard team={awayTeam} side="away" />
      </div>

      {/* ── Action buttons ─────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center gap-3">
        <button
          onClick={startExhibition}
          className="bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-black font-black text-base px-14 py-3.5 rounded-xl shadow-lg transition-all tracking-wide"
        >
          Start Exhibition
        </button>

        {/* Future game modes — shown as disabled placeholders */}
        <div className="flex gap-2 mt-1">
          {["Season Mode", "Tournament", "Recruit", "Playbook"].map((mode) => (
            <button
              key={mode}
              disabled
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white/20 tracking-wide cursor-not-allowed"
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}
              title="Coming soon"
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <p className="absolute bottom-5 text-gray-700 text-xs z-10">
        Early prototype · Sim-first basketball engine
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Team card sub-component
// ---------------------------------------------------------------------------

interface TeamCardProps {
  team: { name: string; abbreviation: string; primaryColor: string; secondaryColor: string };
  side: "home" | "away";
}

function TeamCard({ team, side }: TeamCardProps) {
  const isHome = side === "home";

  return (
    <div
      className="flex flex-col items-center justify-center px-10 py-8 gap-3"
      style={{
        background: "rgba(14,14,22,0.96)",
        borderTop: `3px solid ${team.primaryColor}`,
        minWidth: 160,
      }}
    >
      {/* Jersey circle */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center font-black text-xl shadow-lg"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${team.primaryColor}cc, ${team.primaryColor}66)`,
          border: `2px solid ${team.primaryColor}`,
          color: team.secondaryColor,
        }}
      >
        {team.abbreviation}
      </div>

      <div className="flex flex-col items-center gap-0.5">
        <span className="text-white font-bold text-sm tracking-wide">
          {team.name}
        </span>
        <span
          className="text-xs font-semibold tracking-widest uppercase"
          style={{ color: team.primaryColor }}
        >
          {isHome ? "Home" : "Away"}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Decorative SVG court lines
// ---------------------------------------------------------------------------

function CourtDecoration() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {/* Center circle */}
      <circle
        cx="600" cy="400" r="120"
        fill="none"
        stroke="rgba(255,255,255,0.035)"
        strokeWidth="2"
      />
      {/* Half-court line */}
      <line
        x1="600" y1="80" x2="600" y2="720"
        stroke="rgba(255,255,255,0.03)"
        strokeWidth="2"
      />
      {/* Left key */}
      <rect
        x="80" y="285" width="160" height="230"
        fill="none"
        stroke="rgba(255,255,255,0.03)"
        strokeWidth="2"
      />
      {/* Right key */}
      <rect
        x="960" y="285" width="160" height="230"
        fill="none"
        stroke="rgba(255,255,255,0.03)"
        strokeWidth="2"
      />
      {/* Left 3-pt arc */}
      <path
        d="M 80 240 A 240 240 0 0 1 80 560"
        fill="none"
        stroke="rgba(255,255,255,0.025)"
        strokeWidth="2"
      />
      {/* Right 3-pt arc */}
      <path
        d="M 1120 240 A 240 240 0 0 0 1120 560"
        fill="none"
        stroke="rgba(255,255,255,0.025)"
        strokeWidth="2"
      />
    </svg>
  );
}

