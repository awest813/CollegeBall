/**
 * SeasonHub – the main screen for head-coach / season mode.
 *
 * Displays the coach profile, current record, the next scheduled game,
 * and the full season schedule with results.
 */

import { useGameStore } from "../store/gameStore";
import type { Coach, Season, SeasonGame, SeasonRecord } from "../game/types";
import type { Player, PlayerGameStats } from "../game/types";

export default function SeasonHub() {
  const season             = useGameStore((s) => s.season);
  const playSeasonGame     = useGameStore((s) => s.playSeasonGame);
  const simulateSeasonGame = useGameStore((s) => s.simulateSeasonGame);
  const startSeason        = useGameStore((s) => s.startSeason);
  const setScreen          = useGameStore((s) => s.setScreen);

  if (!season) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#07111b] text-white">
        <button
          onClick={() => setScreen("menu")}
          className="rounded-full border border-white/12 bg-white/5 px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/10"
        >
          Back to Menu
        </button>
      </div>
    );
  }

  const nextGame        = season.schedule[season.currentGameIndex] ?? null;
  const isSeasonComplete = season.currentGameIndex >= season.schedule.length;

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[#07111b] pb-[max(1rem,env(safe-area-inset-bottom,0px))] text-white">
      <SeasonBackgroundLayers />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1200px] flex-col px-5 py-5 sm:px-8 sm:py-7">
        {/* ---- Header ---- */}
        <header className="flex items-start justify-between gap-4 border-b border-white/8 pb-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.45em] text-cyan-200/70">
              Head Coach Mode
            </div>
            <h1 className="mt-2 text-4xl font-black uppercase leading-none tracking-[0.04em] text-white sm:text-5xl">
              Season Hub
            </h1>
            <p className="mt-2 text-sm text-white/50">
              {season.team.name} · {season.year} Season
            </p>
          </div>
          <button
            onClick={() => setScreen("menu")}
            className="mt-1 shrink-0 rounded-full border border-white/12 bg-white/5 px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.18em] text-white/60 transition hover:bg-white/10"
          >
            Main Menu
          </button>
        </header>

        <main className="flex flex-1 flex-col gap-5 py-5">
          {/* ---- Coach + Record ---- */}
          <div className="grid gap-5 sm:grid-cols-2">
            <CoachCard coach={season.coach} season={season} />
            <RecordCard record={season.record} gamesPlayed={season.currentGameIndex} total={season.schedule.length} />
          </div>

          {/* ---- Next game or season-complete banner ---- */}
          {isSeasonComplete ? (
            <SeasonCompleteCard record={season.record} onNewSeason={startSeason} />
          ) : (
            nextGame && (
              <NextGameCard
                game={nextGame}
                onPlay={playSeasonGame}
                onSim={simulateSeasonGame}
              />
            )
          )}

          {/* ---- Roster ---- */}
          <RosterPanel season={season} />

          {/* ---- Season stats (only shown once at least one 3D game has been played) ---- */}
          {season.gamesPlayedWithStats > 0 && (
            <SeasonStatsPanel season={season} />
          )}

          {/* ---- Full schedule ---- */}
          <ScheduleGrid schedule={season.schedule} currentIndex={season.currentGameIndex} />
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface CoachCardProps {
  coach: Coach;
  season: Season;
}

function CoachCard({ coach, season }: CoachCardProps) {
  const attrs: { label: string; value: number }[] = [
    { label: "Offense",     value: coach.offense },
    { label: "Defense",     value: coach.defense },
    { label: "Recruiting",  value: coach.recruiting },
    { label: "Development", value: coach.development },
  ];

  return (
    <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,rgba(6,14,23,0.97),rgba(5,10,18,0.85))] px-6 py-7 sm:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_40%)]" />
      <div className="relative">
        <div className="text-[11px] font-semibold uppercase tracking-[0.4em] text-cyan-200/65">
          Head Coach
        </div>
        <div className="mt-3 text-3xl font-black uppercase tracking-[0.06em] text-white">
          {coach.firstName} {coach.lastName}
        </div>
        <div className="mt-1 text-sm text-white/55">{season.team.name}</div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          {attrs.map(({ label, value }) => (
            <CoachAttr key={label} label={label} value={value} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CoachAttr({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-black/18 px-4 py-3 backdrop-blur-sm">
      <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/38">
        {label}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="text-xl font-black text-white">{value}</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-cyan-400/70"
            style={{ width: `${value}%` }}
          />
        </div>
      </div>
    </div>
  );
}

interface RecordCardProps {
  record: SeasonRecord;
  gamesPlayed: number;
  total: number;
}

function RecordCard({ record, gamesPlayed, total }: RecordCardProps) {
  const pct = gamesPlayed > 0
    ? Math.round((record.wins / gamesPlayed) * 1000) / 10
    : 0;

  return (
    <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,rgba(6,14,23,0.97),rgba(5,10,18,0.85))] px-6 py-7 sm:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.14),transparent_40%)]" />
      <div className="relative">
        <div className="text-[11px] font-semibold uppercase tracking-[0.4em] text-amber-200/65">
          Season Record
        </div>
        <div className="mt-3 flex items-baseline gap-4">
          <span className="text-5xl font-black text-white">{record.wins}</span>
          <span className="text-3xl font-black text-white/30">–</span>
          <span className="text-5xl font-black text-white/60">{record.losses}</span>
        </div>
        <div className="mt-2 text-sm text-white/50">
          {gamesPlayed} of {total} games played
          {gamesPlayed > 0 && (
            <span className="ml-2 text-white/35">· {pct}% win</span>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-[20px] border border-white/10 bg-black/18 px-4 py-3 backdrop-blur-sm">
            <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/38">
              Wins
            </div>
            <div className="mt-1.5 text-2xl font-black text-emerald-400">
              {record.wins}
            </div>
          </div>
          <div className="rounded-[20px] border border-white/10 bg-black/18 px-4 py-3 backdrop-blur-sm">
            <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/38">
              Losses
            </div>
            <div className="mt-1.5 text-2xl font-black text-red-400">
              {record.losses}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface NextGameCardProps {
  game: SeasonGame;
  onPlay: () => void;
  onSim: () => void;
}

function NextGameCard({ game, onPlay, onSim }: NextGameCardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-[36px] border border-amber-200/18 px-6 py-7 shadow-[0_28px_80px_rgba(0,0,0,0.3)] sm:px-8"
      style={{
        background: `linear-gradient(135deg, ${game.opponent.primaryColor}28, rgba(6,14,23,0.96))`,
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_40%)]" />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.42em] text-amber-200/72">
            Week {game.week} · {game.isHome ? "Home" : "Away"}
          </div>
          <h2 className="mt-3 text-3xl font-black uppercase tracking-[0.06em] text-white sm:text-4xl">
            vs {game.opponent.abbreviation}
          </h2>
          <p className="mt-1 text-sm text-white/60">{game.opponent.name}</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: game.opponent.primaryColor }}
            />
            Opponent strength: {game.opponent.overall}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:items-end">
          <button
            onClick={onPlay}
            className="rounded-[22px] bg-amber-300 px-7 py-3.5 text-sm font-black uppercase tracking-[0.2em] text-slate-950 transition hover:bg-amber-200 active:scale-95"
          >
            Play Game
          </button>
          <button
            onClick={onSim}
            className="rounded-[22px] border border-white/12 bg-white/6 px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/12 active:scale-95"
          >
            Simulate
          </button>
        </div>
      </div>
    </div>
  );
}

interface SeasonCompleteCardProps {
  record: SeasonRecord;
  onNewSeason: () => void;
}

function SeasonCompleteCard({ record, onNewSeason }: SeasonCompleteCardProps) {
  const total = record.wins + record.losses;
  const pct   = total > 0 ? Math.round((record.wins / total) * 100) : 0;

  return (
    <div className="relative overflow-hidden rounded-[36px] border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(4,120,87,0.15),rgba(6,14,23,0.96))] px-6 py-8 sm:px-8">
      <div className="text-[11px] font-semibold uppercase tracking-[0.42em] text-emerald-300/72">
        Season Complete
      </div>
      <h2 className="mt-3 text-3xl font-black uppercase tracking-[0.06em] text-white sm:text-4xl">
        Final Record: {record.wins}–{record.losses}
      </h2>
      <p className="mt-2 text-sm text-white/60">
        {pct >= 70
          ? "Outstanding season — conference contender material."
          : pct >= 50
          ? "Solid year. Keep building the program."
          : "Tough year, but every lesson counts."}
      </p>
      <button
        onClick={onNewSeason}
        className="mt-6 rounded-[22px] bg-emerald-400 px-7 py-3.5 text-sm font-black uppercase tracking-[0.2em] text-slate-950 transition hover:bg-emerald-300 active:scale-95"
      >
        New Season
      </button>
    </div>
  );
}

interface ScheduleGridProps {
  schedule: SeasonGame[];
  currentIndex: number;
}

// ---------------------------------------------------------------------------
// Roster Panel
// ---------------------------------------------------------------------------

interface RosterPanelProps {
  season: Season;
}

const POSITION_LABELS: Record<string, string> = {
  PG: "PG", SG: "SG", SF: "SF", PF: "PF", C: "C",
};

function RosterPanel({ season }: RosterPanelProps) {
  const { team } = season;
  const lineupIds = new Set(team.lineup);
  const starters = team.lineup
    .map((id) => team.roster.find((p) => p.id === id))
    .filter((p): p is Player => p !== undefined);
  const bench = team.roster.filter((p) => !lineupIds.has(p.id));

  return (
    <div className="rounded-[36px] border border-white/10 bg-[rgba(6,14,23,0.82)] px-6 py-7 sm:px-8">
      <div className="text-[11px] font-semibold uppercase tracking-[0.4em] text-white/42">
        Roster
      </div>

      {/* Starters */}
      <div className="mt-4">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-cyan-200/55">
          Starters
        </div>
        <div className="flex flex-col gap-2">
          {starters.map((p) => (
            <RosterRow key={p.id} player={p} />
          ))}
        </div>
      </div>

      {/* Bench */}
      {bench.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/35">
            Bench
          </div>
          <div className="flex flex-col gap-2">
            {bench.map((p) => (
              <RosterRow key={p.id} player={p} isBench />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface RosterRowProps {
  player: Player;
  isBench?: boolean;
}

function RosterRow({ player: p, isBench = false }: RosterRowProps) {
  const ratings = [
    { label: "SPD", value: p.ratings.speed },
    { label: "SHT", value: p.ratings.shooting },
    { label: "DEF", value: p.ratings.defense },
    { label: "REB", value: p.ratings.rebounding },
  ];

  return (
    <div
      className={`flex items-center gap-3 rounded-[20px] border px-4 py-3 ${
        isBench ? "border-white/6 bg-white/[0.02]" : "border-white/10 bg-white/[0.04]"
      }`}
    >
      {/* Jersey number */}
      <div className="w-6 shrink-0 text-center text-[11px] font-mono font-semibold text-white/35">
        {p.number}
      </div>

      {/* Position badge */}
      <div className="w-8 shrink-0 rounded-md bg-white/8 px-1 py-0.5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-white/55">
        {POSITION_LABELS[p.position] ?? p.position}
      </div>

      {/* Name */}
      <div className={`flex-1 text-sm font-semibold ${isBench ? "text-white/55" : "text-white/85"}`}>
        {p.firstName[0]}. {p.lastName}
      </div>

      {/* Ratings */}
      <div className="flex shrink-0 gap-2">
        {ratings.map(({ label, value }) => (
          <div key={label} className="hidden min-w-[40px] flex-col items-center sm:flex">
            <span className="text-[9px] font-semibold uppercase tracking-[0.25em] text-white/30">
              {label}
            </span>
            <span className={`mt-0.5 text-xs font-black ${value >= 80 ? "text-cyan-300" : value >= 65 ? "text-white/80" : "text-white/45"}`}>
              {value}
            </span>
          </div>
        ))}
        {/* Condensed overall for mobile */}
        <div className="flex flex-col items-center sm:hidden">
          <span className="text-[9px] font-semibold uppercase tracking-[0.25em] text-white/30">OVR</span>
          <span className="mt-0.5 text-xs font-black text-white/80">
            {Math.round((p.ratings.speed + p.ratings.shooting + p.ratings.defense + p.ratings.rebounding) / 4)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Season Stats Panel
// ---------------------------------------------------------------------------

interface SeasonStatsPanelProps {
  season: Season;
}

function SeasonStatsPanel({ season }: SeasonStatsPanelProps) {
  const { team, seasonStats, gamesPlayedWithStats } = season;
  const gp = gamesPlayedWithStats;
  if (gp === 0) return null;

  const lineupIds = new Set(team.lineup);
  const starters = team.lineup
    .map((id) => team.roster.find((p) => p.id === id))
    .filter((p): p is Player => p !== undefined);
  const bench = team.roster.filter((p) => !lineupIds.has(p.id) && !!seasonStats[p.id]);
  const allPlayers = [...starters, ...bench];

  const avg = (n: number) => gp > 0 ? (n / gp).toFixed(1) : "—";

  const COL = "px-2 py-1.5 text-center text-[11px] font-mono";
  const HDR = `${COL} text-white/35 font-semibold tracking-wider`;

  return (
    <div className="rounded-[36px] border border-white/10 bg-[rgba(6,14,23,0.82)] px-6 py-7 sm:px-8">
      <div className="flex items-baseline gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.4em] text-white/42">
          Season Stats
        </div>
        <div className="text-[10px] text-white/28">
          {gp} game{gp !== 1 ? "s" : ""} · per-game averages
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <th className={`${HDR} text-left pl-0`} style={{ width: "38%" }}>Player</th>
              <th className={HDR}>PTS</th>
              <th className={HDR}>REB</th>
              <th className={HDR}>AST</th>
              <th className={HDR}>STL</th>
              <th className={HDR}>BLK</th>
              <th className={HDR}>PF</th>
            </tr>
          </thead>
          <tbody>
            {allPlayers.map((p) => {
              const s: PlayerGameStats = seasonStats[p.id] ?? {
                points: 0, fieldGoalsMade: 0, fieldGoalsAttempted: 0,
                threesMade: 0, threesAttempted: 0, freeThrowsMade: 0,
                freeThrowsAttempted: 0, rebounds: 0, assists: 0, steals: 0,
                turnovers: 0, blocks: 0, fouls: 0, minutesPlayed: 0,
              };
              const isBench = !lineupIds.has(p.id);
              return (
                <tr
                  key={p.id}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <td className="py-1.5 pl-0 text-left">
                    <span className="text-[10px] font-mono text-white/30 mr-1.5">#{p.number}</span>
                    <span className={`text-[11px] font-semibold ${isBench ? "text-white/50" : "text-white/80"}`}>
                      {p.firstName[0]}. {p.lastName}
                    </span>
                  </td>
                  <td className={`${COL} font-bold text-white`}>{avg(s.points)}</td>
                  <td className={`${COL} text-white/60`}>{avg(s.rebounds)}</td>
                  <td className={`${COL} text-white/60`}>{avg(s.assists)}</td>
                  <td className={`${COL} text-white/60`}>{avg(s.steals)}</td>
                  <td className={`${COL} text-white/60`}>{avg(s.blocks)}</td>
                  <td className={`${COL} text-white/60`}>{avg(s.fouls)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScheduleGrid({ schedule, currentIndex }: ScheduleGridProps) {
  return (
    <div className="rounded-[36px] border border-white/10 bg-[rgba(6,14,23,0.82)] px-6 py-7 sm:px-8">
      <div className="text-[11px] font-semibold uppercase tracking-[0.4em] text-white/42">
        Schedule
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {schedule.map((game, i) => (
          <ScheduleRow
            key={game.id}
            game={game}
            isNext={i === currentIndex}
            isPast={i < currentIndex}
          />
        ))}
      </div>
    </div>
  );
}

interface ScheduleRowProps {
  game: SeasonGame;
  isNext: boolean;
  isPast: boolean;
}

function ScheduleRow({ game, isNext, isPast }: ScheduleRowProps) {
  const resultColor =
    game.result === "win"  ? "text-emerald-400" :
    game.result === "loss" ? "text-red-400"     :
    "text-white/30";

  const resultLabel =
    game.result === "win"  ? "W" :
    game.result === "loss" ? "L" :
    isNext                 ? "Next" :
    "–";

  return (
    <div
      className={`flex items-center gap-4 rounded-[20px] border px-5 py-3.5 transition ${
        isNext
          ? "border-amber-200/25 bg-amber-300/6"
          : "border-white/6 bg-white/[0.025]"
      }`}
    >
      {/* Week badge */}
      <div className="w-10 shrink-0 text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-white/35">
        Wk {game.week}
      </div>

      {/* Venue dot */}
      <div
        className={`h-2 w-2 shrink-0 rounded-full ${game.isHome ? "bg-cyan-400/60" : "bg-white/20"}`}
        title={game.isHome ? "Home" : "Away"}
      />

      {/* Opponent name */}
      <div className="flex-1 text-sm font-semibold text-white/80">
        {game.isHome ? "" : "@ "}{game.opponent.name}
      </div>

      {/* Score (if played) */}
      {isPast && game.userScore !== null && game.opponentScore !== null ? (
        <div className="text-right text-sm font-mono text-white/55">
          {game.userScore}–{game.opponentScore}
        </div>
      ) : null}

      {/* Result badge */}
      <div className={`w-10 shrink-0 text-right text-sm font-black uppercase ${resultColor}`}>
        {resultLabel}
      </div>
    </div>
  );
}

function SeasonBackgroundLayers() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_30%),linear-gradient(180deg,#07111b_0%,#040a12_100%)]" />
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/4" />
      <div className="absolute left-[8%] top-1/2 h-px w-[84%] bg-white/4" />
      <div className="absolute bottom-[-10%] left-1/2 h-[30vw] w-[30vw] min-h-[200px] min-w-[200px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.1),transparent_62%)] blur-3xl" />
    </>
  );
}
