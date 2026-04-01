import { useGameStore } from "../store/gameStore";

function formatClock(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function GameMenuOverlay() {
  const isPauseMenuOpen = useGameStore((s) => s.isPauseMenuOpen);
  const simStatus = useGameStore((s) => s.simStatus);
  const score = useGameStore((s) => s.score);
  const gameClock = useGameStore((s) => s.gameClock);
  const shotClock = useGameStore((s) => s.shotClock);
  const homeTeam = useGameStore((s) => s.homeTeam);
  const awayTeam = useGameStore((s) => s.awayTeam);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const gameSpeed = useGameStore((s) => s.gameSpeed);
  const closePauseMenu = useGameStore((s) => s.closePauseMenu);
  const startExhibition = useGameStore((s) => s.startExhibition);
  const returnToMainMenu = useGameStore((s) => s.returnToMainMenu);

  if (!isPauseMenuOpen || simStatus === "finished") {
    return null;
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/76 px-4 py-6 backdrop-blur-md sm:px-6 sm:py-8">
      <div className="polish-rise grid w-full max-w-5xl gap-0 overflow-hidden rounded-[36px] border border-white/10 bg-[#08111d]/96 shadow-[0_40px_120px_rgba(0,0,0,0.45)] lg:grid-cols-[1.2fr_0.8fr]">
        <section className="relative overflow-hidden px-6 py-7 sm:px-8 sm:py-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.22),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.18),transparent_32%)]" />
          <div className="relative">
            <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.4em] text-cyan-200/70">
                  Game Menu
                </div>
                <h2 className="mt-2 text-4xl font-black uppercase tracking-[0.08em] text-white">
                  Sideline Command
                </h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-white/64">
                  Keep the state visible, make the next choice obvious, and
                  step back into the game without losing the flow.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-right backdrop-blur-sm">
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/45">
                  Match Clock
                </div>
                <div className="mt-1 text-2xl font-black text-white">
                  {formatClock(gameClock.remaining)}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <StatusTile
                label="Score"
                value={`${homeTeam.abbreviation} ${score.home} - ${score.away} ${awayTeam.abbreviation}`}
              />
              <StatusTile
                label="Half"
                value={`Half ${gameClock.half}`}
              />
              <StatusTile
                label="Shot Clock"
                value={`${Math.ceil(shotClock.remaining)}s`}
              />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <TeamPanel
                teamName={homeTeam.name}
                abbreviation={homeTeam.abbreviation}
                accent={homeTeam.primaryColor}
                detail="Home floor"
              />
              <TeamPanel
                teamName={awayTeam.name}
                abbreviation={awayTeam.abbreviation}
                accent={awayTeam.primaryColor}
                detail="Road test"
              />
            </div>

            <div className="mt-6 rounded-[28px] border border-white/10 bg-black/20 p-5 backdrop-blur-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/45">
                Quick Notes
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <StatusTile label="Camera" value={cameraMode} />
                <StatusTile label="Speed" value={`${gameSpeed}x`} />
                <StatusTile label="Shortcut" value="Esc closes menu" />
              </div>
            </div>
          </div>
        </section>

        <aside className="border-t border-white/10 bg-black/24 px-6 py-7 sm:px-8 sm:py-8 lg:border-l lg:border-t-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.38em] text-amber-200/65">
            Actions
          </div>
          <div className="mt-5 flex flex-col gap-3.5">
            <button
              onClick={closePauseMenu}
              className="rounded-[24px] bg-white px-5 py-4 text-left text-base font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-cyan-100"
            >
              Resume Game
            </button>
            <button
              onClick={startExhibition}
              className="rounded-[24px] border border-white/10 bg-white/6 px-5 py-4 text-left text-base font-bold uppercase tracking-[0.16em] text-white transition hover:border-white/20 hover:bg-white/10"
            >
              Restart Exhibition
            </button>
            <button
              onClick={returnToMainMenu}
              className="rounded-[24px] border border-white/10 bg-white/6 px-5 py-4 text-left text-base font-bold uppercase tracking-[0.16em] text-white transition hover:border-white/20 hover:bg-white/10"
            >
              Return To Main Menu
            </button>
          </div>

          <div className="mt-10 rounded-[28px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/45">
              Coaching Snapshot
            </div>
            <p className="mt-3 text-sm leading-6 text-white/72">
              Pause is built to feel like a bench huddle: keep the state visible,
              keep the next action obvious, and get back on the floor quickly.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

interface StatusTileProps {
  label: string;
  value: string;
}

function StatusTile({ label, value }: StatusTileProps) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 backdrop-blur-sm">
      <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/40">
        {label}
      </div>
      <div className="mt-2 text-base font-semibold text-white">{value}</div>
    </div>
  );
}

interface TeamPanelProps {
  teamName: string;
  abbreviation: string;
  accent: string;
  detail: string;
}

function TeamPanel({ teamName, abbreviation, accent, detail }: TeamPanelProps) {
  return (
    <div
      className="rounded-[28px] border border-white/10 px-5 py-5 backdrop-blur-sm"
      style={{
        background: `linear-gradient(135deg, ${accent}24, rgba(8, 17, 29, 0.86))`,
      }}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/45">
        {detail}
      </div>
      <div className="mt-3 flex items-center justify-between gap-4">
        <div>
          <div className="text-2xl font-black uppercase tracking-[0.08em] text-white">
            {abbreviation}
          </div>
          <div className="mt-1 text-sm text-white/72">{teamName}</div>
        </div>
        <div
          className="h-12 w-12 rounded-full border"
          style={{ borderColor: `${accent}aa`, background: `${accent}22` }}
        />
      </div>
    </div>
  );
}
