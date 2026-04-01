/**
 * MainMenu – the landing screen with a "Start Exhibition" button.
 */

import { useGameStore } from "../store/gameStore";

export default function MainMenu() {
  const startExhibition = useGameStore((s) => s.startExhibition);
  const homeTeam = useGameStore((s) => s.homeTeam);
  const awayTeam = useGameStore((s) => s.awayTeam);

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex flex-col items-center justify-center select-none">
      {/* Title */}
      <h1 className="text-5xl font-extrabold text-white tracking-tight mb-2">
        🏀 CollegeBall
      </h1>
      <p className="text-gray-400 text-lg mb-12">
        College Basketball Coaching Simulator
      </p>

      {/* Matchup preview */}
      <div className="flex items-center gap-8 mb-12">
        <div className="flex flex-col items-center">
          <div
            className="w-16 h-16 rounded-full border-4 flex items-center justify-center"
            style={{
              borderColor: homeTeam.primaryColor,
              backgroundColor: homeTeam.primaryColor + "33",
            }}
          >
            <span className="text-white font-bold text-xl">
              {homeTeam.abbreviation}
            </span>
          </div>
          <span className="text-white mt-2 text-sm">{homeTeam.name}</span>
        </div>

        <span className="text-gray-500 text-2xl font-bold">vs</span>

        <div className="flex flex-col items-center">
          <div
            className="w-16 h-16 rounded-full border-4 flex items-center justify-center"
            style={{
              borderColor: awayTeam.primaryColor,
              backgroundColor: awayTeam.primaryColor + "33",
            }}
          >
            <span className="text-white font-bold text-xl">
              {awayTeam.abbreviation}
            </span>
          </div>
          <span className="text-white mt-2 text-sm">{awayTeam.name}</span>
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={startExhibition}
        className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-lg px-10 py-3 rounded-lg shadow-lg transition-colors active:scale-95"
      >
        Start Exhibition
      </button>

      {/* Footer hints */}
      <p className="text-gray-600 text-xs mt-16">
        Sim-first basketball coaching game • Early prototype
      </p>
    </div>
  );
}
