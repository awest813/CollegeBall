/**
 * Scoreboard – broadcast-inspired scorebug HUD.
 *
 * Displays:
 *   • Team abbreviations with primary-colour accents
 *   • Live score (large, high-contrast)
 *   • Possession indicator arrow
 *   • Game clock with half label
 *   • Shot clock (turns red below 5 s)
 *   • FINAL badge on game end
 *
 * Styled to read cleanly at any resolution while feeling like a real
 * sports title rather than a debug overlay.
 */

import { useGameStore } from "../store/gameStore";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function phaseBadgeLabel(phase: string): string | null {
  switch (phase) {
    case "PRE_GAME":
      return "Warmup";
    case "TIP_OFF":
      return "Tip Off";
    case "HALFTIME":
      return "Halftime";
    default:
      return null;
  }
}

export default function Scoreboard() {
  const score = useGameStore((s) => s.score);
  const gameClock = useGameStore((s) => s.gameClock);
  const shotClock = useGameStore((s) => s.shotClock);
  const possession = useGameStore((s) => s.possession);
  const homeTeam = useGameStore((s) => s.homeTeam);
  const awayTeam = useGameStore((s) => s.awayTeam);
  const simStatus = useGameStore((s) => s.simStatus);
  const teamFouls = useGameStore((s) => s.teamFouls);
  const settings = useGameStore((s) => s.settings);
  const phase = useGameStore((s) => s.phase);

  const isFinished = simStatus === "finished";
  const shotClockUrgent =
    !isFinished && shotClock.remaining <= 5 && shotClock.running;
  const phaseBadge = !isFinished ? phaseBadgeLabel(phase) : null;

  // Bonus status is determined by the *opponent's* foul count
  // (home team fouls put away team in bonus, and vice versa)
  function bonusLabel(opponentFouls: number): string | null {
    if (opponentFouls >= settings.doubleBonusThreshold) return "BONUS+";
    if (opponentFouls >= settings.bonusFoulThreshold) return "BONUS";
    return null;
  }
  const homeBonusLabel = bonusLabel(teamFouls.away);
  const awayBonusLabel = bonusLabel(teamFouls.home);

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 select-none">
      <div
        className="flex items-stretch rounded-xl overflow-hidden shadow-2xl"
        style={{ border: "1px solid rgba(255,255,255,0.12)" }}
      >
        {/* ── Home team ──────────────────────────────── */}
        <TeamPanel
          abbreviation={homeTeam.abbreviation}
          score={score.home}
          primaryColor={homeTeam.primaryColor}
          hasPossession={possession.team === "home"}
          possessionSide="right"
          fouls={teamFouls.home}
          bonusLabel={homeBonusLabel}
        />

        {/* ── Centre: clocks ─────────────────────────── */}
        <div
          className="flex flex-col items-center justify-center px-5 py-2 min-w-[118px]"
          style={{ background: "rgba(10,10,16,0.92)" }}
        >
          {/* Game clock */}
          <span className="text-white font-mono text-2xl font-black tracking-tight leading-none">
            {isFinished ? "0:00" : formatTime(gameClock.remaining)}
          </span>

          {/* Half label */}
          <span className="text-gray-400 text-[10px] font-semibold tracking-widest uppercase mt-0.5">
            {isFinished ? "Final" : gameClock.half === 1 ? "1st Half" : "2nd Half"}
          </span>

          {phaseBadge && (
            <span
              className="mt-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-[0.22em] uppercase"
              style={{
                color: "#f5d46b",
                background: "rgba(245,212,107,0.12)",
                border: "1px solid rgba(245,212,107,0.18)",
              }}
            >
              {phaseBadge}
            </span>
          )}

          {/* Shot clock */}
          <div
            className={`mt-1 px-2 py-0.5 rounded font-mono text-sm font-bold leading-none ${
              isFinished
                ? "bg-white/5 text-white/35"
                : shotClockUrgent
                  ? "bg-red-600 text-white"
                  : "bg-white/10 text-yellow-300"
            }`}
          >
            {isFinished ? "—" : Math.ceil(shotClock.remaining)}
          </div>

          {isFinished && (
            <span className="mt-1 text-red-400 text-[10px] font-extrabold tracking-widest uppercase">
              FINAL
            </span>
          )}
        </div>

        {/* ── Away team ──────────────────────────────── */}
        <TeamPanel
          abbreviation={awayTeam.abbreviation}
          score={score.away}
          primaryColor={awayTeam.primaryColor}
          hasPossession={possession.team === "away"}
          possessionSide="left"
          fouls={teamFouls.away}
          bonusLabel={awayBonusLabel}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: one team's side of the scorebug
// ---------------------------------------------------------------------------

interface TeamPanelProps {
  abbreviation: string;
  score: number;
  primaryColor: string;
  hasPossession: boolean;
  possessionSide: "left" | "right";
  fouls: number;
  bonusLabel: string | null;
}

function TeamPanel({
  abbreviation,
  score,
  primaryColor,
  hasPossession,
  possessionSide,
  fouls,
  bonusLabel,
}: TeamPanelProps) {
  const isRight = possessionSide === "right";

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${isRight ? "pr-5" : "pl-5"}`}
      style={{ background: "rgba(14,14,22,0.92)" }}
    >
      {/* Colour swatch + abbreviation (home side: swatch left; away side: score left) */}
      {!isRight && (
        <div className="flex flex-col items-center">
          <span className="text-white font-mono text-3xl font-black w-9 text-center leading-none">
            {score}
          </span>
          <span className="text-gray-500 text-[9px] font-semibold tracking-wider mt-1">
            {fouls} PF
          </span>
          {bonusLabel && (
            <span className="text-yellow-400 text-[8px] font-extrabold tracking-widest mt-0.5">
              {bonusLabel}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Team colour bar */}
        <div
          className="w-1 rounded-full self-stretch"
          style={{ backgroundColor: primaryColor, minHeight: 28 }}
        />
        <span
          className="text-white font-bold text-sm tracking-widest uppercase"
          style={{ letterSpacing: "0.12em" }}
        >
          {abbreviation}
        </span>
      </div>

      {isRight && (
        <div className="flex flex-col items-center">
          <span className="text-white font-mono text-3xl font-black w-9 text-center leading-none">
            {score}
          </span>
          <span className="text-gray-500 text-[9px] font-semibold tracking-wider mt-1">
            {fouls} PF
          </span>
          {bonusLabel && (
            <span className="text-yellow-400 text-[8px] font-extrabold tracking-widest mt-0.5">
              {bonusLabel}
            </span>
          )}
        </div>
      )}

      {/* Possession dot / arrow */}
      {hasPossession && (
        <span
          className="text-xs font-bold leading-none"
          style={{ color: primaryColor }}
          title="Ball possession"
        >
          {isRight ? "▶" : "◀"}
        </span>
      )}
      {!hasPossession && <span className="w-3" />}
    </div>
  );
}
