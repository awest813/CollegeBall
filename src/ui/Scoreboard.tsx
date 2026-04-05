/**
 * Scoreboard – broadcast-inspired scorebug HUD.
 *
 * Displays:
 *   • Team abbreviations with glowing primary-colour accent bars
 *   • Live score with flash animation on increment
 *   • Possession indicator arrow
 *   • Game clock with half label
 *   • Shot clock (turns red + pulses below 5 s)
 *   • Team fouls and bonus status
 *   • FINAL badge on game end
 */

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../store/gameStore";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function phaseBadgeLabel(phase: string): string | null {
  switch (phase) {
    case "PRE_GAME": return "Warmup";
    case "TIP_OFF":  return "Tip Off";
    case "HALFTIME": return "Halftime";
    case "OVERTIME": return "Overtime";
    default:         return null;
  }
}

export default function Scoreboard() {
  const score      = useGameStore((s) => s.score);
  const gameClock  = useGameStore((s) => s.gameClock);
  const shotClock  = useGameStore((s) => s.shotClock);
  const possession = useGameStore((s) => s.possession);
  const homeTeam   = useGameStore((s) => s.homeTeam);
  const awayTeam   = useGameStore((s) => s.awayTeam);
  const simStatus  = useGameStore((s) => s.simStatus);
  const teamFouls  = useGameStore((s) => s.teamFouls);
  const settings   = useGameStore((s) => s.settings);
  const phase      = useGameStore((s) => s.phase);
  const overtimePeriod = useGameStore((s) => s.overtimePeriod);

  const isFinished   = simStatus === "finished";
  const shotClockUrgent = !isFinished && shotClock.remaining <= 5 && shotClock.running;
  const phaseBadge   = !isFinished ? phaseBadgeLabel(phase) : null;

  // Track score changes for the flash animation
  const prevHomeScore = useRef(score.home);
  const prevAwayScore = useRef(score.away);
  const [homeFlash, setHomeFlash] = useState(false);
  const [awayFlash, setAwayFlash] = useState(false);

  useEffect(() => {
    if (score.home !== prevHomeScore.current) {
      prevHomeScore.current = score.home;
      setHomeFlash(true);
      setTimeout(() => setHomeFlash(false), 600);
    }
  }, [score.home]);

  useEffect(() => {
    if (score.away !== prevAwayScore.current) {
      prevAwayScore.current = score.away;
      setAwayFlash(true);
      setTimeout(() => setAwayFlash(false), 600);
    }
  }, [score.away]);

  function bonusLabel(opponentFouls: number): string | null {
    if (opponentFouls >= settings.doubleBonusThreshold) return "BONUS+";
    if (opponentFouls >= settings.bonusFoulThreshold)   return "BONUS";
    return null;
  }
  const homeBonusLabel = bonusLabel(teamFouls.away);
  const awayBonusLabel = bonusLabel(teamFouls.home);

  return (
    <div className="absolute left-1/2 top-[max(0.75rem,env(safe-area-inset-top,0px))] z-20 -translate-x-1/2 select-none px-3 sm:px-4">
      <div
        className="flex items-stretch overflow-hidden rounded-2xl shadow-2xl backdrop-blur-md"
        style={{ border: "1px solid rgba(255,255,255,0.13)", boxShadow: "0 8px 32px rgba(0,0,0,0.55)" }}
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
          scoreFlash={homeFlash}
        />

        {/* ── Centre: clocks ─────────────────────────── */}
        <div
          className="flex min-w-[122px] flex-col items-center justify-center px-5 py-2.5"
          style={{ background: "rgba(8,8,14,0.95)" }}
        >
          {/* Game clock */}
          <span className="text-white font-mono text-2xl font-black tracking-tight leading-none tabular-nums">
            {isFinished ? "0:00" : formatTime(gameClock.remaining)}
          </span>

          {/* Half label */}
          <span className="text-gray-400 text-[10px] font-semibold tracking-widest uppercase mt-0.5">
            {isFinished
              ? "Final"
              : overtimePeriod > 0
                ? overtimePeriod === 1 ? "Overtime" : `OT${overtimePeriod}`
                : gameClock.half === 1 ? "1st Half" : "2nd Half"
            }
          </span>

          {phaseBadge && (
            <span
              className="mt-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-[0.22em] uppercase"
              style={{
                color: "#f5d46b",
                background: "rgba(245,212,107,0.12)",
                border: "1px solid rgba(245,212,107,0.22)",
              }}
            >
              {phaseBadge}
            </span>
          )}

          {/* Shot clock */}
          <div
            className={`mt-1.5 px-2.5 py-0.5 rounded font-mono text-sm font-bold leading-none tabular-nums ${
              isFinished
                ? "bg-white/5 text-white/30"
                : shotClockUrgent
                  ? "bg-red-600 text-white shot-clock-urgent"
                  : "bg-white/10 text-yellow-300"
            }`}
            style={shotClockUrgent ? { boxShadow: "0 0 8px rgba(220,38,38,0.6)" } : undefined}
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
          scoreFlash={awayFlash}
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
  scoreFlash: boolean;
}

function TeamPanel({
  abbreviation,
  score,
  primaryColor,
  hasPossession,
  possessionSide,
  fouls,
  bonusLabel,
  scoreFlash,
}: TeamPanelProps) {
  const isRight = possessionSide === "right";

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${isRight ? "pr-5" : "pl-5"}`}
      style={{
        background: "rgba(12,12,20,0.95)",
        borderTop: `2px solid ${primaryColor}`,
        boxShadow: `inset 0 -1px 0 0 ${primaryColor}18`,
      }}
    >
      {!isRight && (
        <div className="flex flex-col items-center min-w-[36px]">
          <span
            className={`text-white font-mono text-3xl font-black w-9 text-center leading-none tabular-nums transition-colors ${scoreFlash ? "score-flash" : ""}`}
            style={scoreFlash ? { color: primaryColor } : undefined}
          >
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
        {/* Glowing team colour bar */}
        <div
          className="w-1 rounded-full self-stretch"
          style={{
            backgroundColor: primaryColor,
            minHeight: 28,
            boxShadow: `0 0 6px ${primaryColor}80`,
          }}
        />
        <span
          className="text-white font-bold text-sm tracking-widest uppercase"
          style={{ letterSpacing: "0.12em" }}
        >
          {abbreviation}
        </span>
      </div>

      {isRight && (
        <div className="flex flex-col items-center min-w-[36px]">
          <span
            className={`text-white font-mono text-3xl font-black w-9 text-center leading-none tabular-nums ${scoreFlash ? "score-flash" : ""}`}
            style={scoreFlash ? { color: primaryColor } : undefined}
          >
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

      {/* Animated possession arrow */}
      {hasPossession ? (
        <span
          className="text-xs font-bold leading-none possession-pulse"
          style={{ color: primaryColor, textShadow: `0 0 8px ${primaryColor}` }}
          title="Ball possession"
        >
          {isRight ? "▶" : "◀"}
        </span>
      ) : (
        <span className="w-3" />
      )}
    </div>
  );
}
