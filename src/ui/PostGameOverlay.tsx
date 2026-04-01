/**
 * PostGameOverlay – full-screen end-of-game summary.
 *
 * Appears when simStatus === "finished". Shows the final score, winner
 * highlight, per-player box score, and buttons to play again or return
 * to the main menu.
 */

import { useGameStore } from "../store/gameStore";
import type { PlayerGameStats, Team } from "../game/types";

export default function PostGameOverlay() {
  const simStatus = useGameStore((s) => s.simStatus);
  const score = useGameStore((s) => s.score);
  const homeTeam = useGameStore((s) => s.homeTeam);
  const awayTeam = useGameStore((s) => s.awayTeam);
  const playerStats = useGameStore((s) => s.playerStats);
  const startExhibition = useGameStore((s) => s.startExhibition);
  const setScreen = useGameStore((s) => s.setScreen);

  if (simStatus !== "finished") return null;

  const homeWon = score.home > score.away;
  const awayWon = score.away > score.home;
  const isTie = score.home === score.away;

  const winnerName = isTie ? null : homeWon ? homeTeam.name : awayTeam.name;
  const winnerColor = isTie
    ? "#a0a0a0"
    : homeWon
    ? homeTeam.primaryColor
    : awayTeam.primaryColor;

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center select-none overflow-y-auto py-6"
      style={{ background: "rgba(4,4,10,0.92)", backdropFilter: "blur(6px)" }}
    >
      {/* Result header */}
      <p className="text-gray-400 text-sm font-semibold tracking-widest uppercase mb-3">
        Final Score
      </p>

      {/* Score card */}
      <div
        className="flex items-stretch rounded-2xl overflow-hidden shadow-2xl mb-4"
        style={{ border: "1px solid rgba(255,255,255,0.1)" }}
      >
        {/* Home team */}
        <TeamResult
          name={homeTeam.name}
          abbreviation={homeTeam.abbreviation}
          score={score.home}
          primaryColor={homeTeam.primaryColor}
          isWinner={homeWon}
        />

        {/* Divider */}
        <div
          className="flex items-center justify-center px-6 py-6 text-gray-500 font-bold text-lg"
          style={{ background: "rgba(10,10,18,0.95)" }}
        >
          —
        </div>

        {/* Away team */}
        <TeamResult
          name={awayTeam.name}
          abbreviation={awayTeam.abbreviation}
          score={score.away}
          primaryColor={awayTeam.primaryColor}
          isWinner={awayWon}
        />
      </div>

      {/* Winner banner */}
      {!isTie && (
        <p
          className="text-lg font-extrabold tracking-wide mb-5"
          style={{ color: winnerColor }}
        >
          {winnerName} wins!
        </p>
      )}
      {isTie && (
        <p className="text-lg font-extrabold tracking-wide text-gray-400 mb-5">
          It&apos;s a tie!
        </p>
      )}

      {/* Box score */}
      <div className="w-full max-w-3xl px-4 mb-6 flex flex-col gap-4">
        <BoxScore
          team={homeTeam}
          playerStats={playerStats}
          primaryColor={homeTeam.primaryColor}
        />
        <BoxScore
          team={awayTeam}
          playerStats={playerStats}
          primaryColor={awayTeam.primaryColor}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-4">
        <button
          onClick={startExhibition}
          className="bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-black font-bold px-8 py-3 rounded-xl shadow-lg transition-all text-sm tracking-wide"
        >
          Play Again
        </button>
        <button
          onClick={() => setScreen("menu")}
          className="bg-white/10 hover:bg-white/20 active:scale-95 text-white font-semibold px-8 py-3 rounded-xl transition-all text-sm tracking-wide"
          style={{ border: "1px solid rgba(255,255,255,0.15)" }}
        >
          Main Menu
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: one team's result column
// ---------------------------------------------------------------------------

interface TeamResultProps {
  name: string;
  abbreviation: string;
  score: number;
  primaryColor: string;
  isWinner: boolean;
}

function TeamResult({
  name,
  abbreviation,
  score,
  primaryColor,
  isWinner,
}: TeamResultProps) {
  return (
    <div
      className="flex flex-col items-center justify-center px-10 py-8 gap-1"
      style={{
        background: "rgba(14,14,22,0.95)",
        borderTop: isWinner ? `3px solid ${primaryColor}` : "3px solid transparent",
      }}
    >
      {/* Team colour bar */}
      <div
        className="w-8 h-1 rounded-full mb-2"
        style={{ backgroundColor: primaryColor }}
      />
      <span
        className="font-black text-5xl font-mono leading-none"
        style={{ color: isWinner ? "white" : "rgba(255,255,255,0.55)" }}
      >
        {score}
      </span>
      <span
        className="font-bold text-sm tracking-widest uppercase mt-2"
        style={{ color: isWinner ? primaryColor : "rgba(255,255,255,0.45)" }}
      >
        {abbreviation}
      </span>
      <span
        className="text-xs mt-0.5"
        style={{ color: "rgba(255,255,255,0.3)" }}
      >
        {name}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: per-team box score table
// ---------------------------------------------------------------------------

interface BoxScoreProps {
  team: Team;
  playerStats: Record<string, PlayerGameStats>;
  primaryColor: string;
}

function fgStr(made: number, attempted: number): string {
  return attempted > 0 ? `${made}/${attempted}` : "0/0";
}

function BoxScore({ team, playerStats, primaryColor }: BoxScoreProps) {
  // Show only players in the starting lineup
  const lineupPlayers = team.lineup
    .map((id) => team.roster.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  const COL = "px-2 py-1.5 text-center text-[11px] font-mono";
  const HDR = `${COL} text-gray-500 font-semibold tracking-wider`;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(10,10,18,0.90)" }}
    >
      {/* Team header */}
      <div
        className="px-3 py-1.5 text-xs font-black tracking-widest uppercase"
        style={{ color: primaryColor, borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {team.name}
      </div>

      {/* Column headers */}
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <th className={`${HDR} text-left pl-3`} style={{ width: "36%" }}>Player</th>
            <th className={HDR}>PTS</th>
            <th className={HDR}>FG</th>
            <th className={HDR}>3PM</th>
            <th className={HDR}>FT</th>
            <th className={HDR}>REB</th>
            <th className={HDR}>STL</th>
            <th className={HDR}>PF</th>
          </tr>
        </thead>
        <tbody>
          {lineupPlayers.map((p) => {
            const s: PlayerGameStats = playerStats[p.id] ?? {
              points: 0, fieldGoalsMade: 0, fieldGoalsAttempted: 0,
              threesMade: 0, threesAttempted: 0, freeThrowsMade: 0,
              freeThrowsAttempted: 0, rebounds: 0, steals: 0, fouls: 0,
            };
            return (
              <tr
                key={p.id}
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
              >
                <td className="px-3 py-1.5 text-left">
                  <span className="text-gray-500 text-[10px] font-mono mr-1.5">#{p.number}</span>
                  <span className="text-white text-[11px] font-semibold">
                    {p.firstName[0]}. {p.lastName}
                  </span>
                </td>
                <td className={`${COL} text-white font-bold`}>{s.points}</td>
                <td className={`${COL} text-gray-300`}>{fgStr(s.fieldGoalsMade, s.fieldGoalsAttempted)}</td>
                <td className={`${COL} text-gray-300`}>{fgStr(s.threesMade, s.threesAttempted)}</td>
                <td className={`${COL} text-gray-300`}>{fgStr(s.freeThrowsMade, s.freeThrowsAttempted)}</td>
                <td className={`${COL} text-gray-300`}>{s.rebounds}</td>
                <td className={`${COL} text-gray-300`}>{s.steals}</td>
                <td className={`${COL} ${s.fouls >= 5 ? "text-red-400" : "text-gray-300"}`}>{s.fouls}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
