import { useGameStore } from "../store/gameStore";
import type { Team } from "../game/types";

const MODE_CARDS = [
  {
    title: "Exhibition",
    status: "Ready now",
    summary: "Jump into a full sim-driven matchup with broadcast presentation.",
    active: true,
  },
  {
    title: "Season",
    status: "In development",
    summary: "Schedule flow, roster management, and long-form progression.",
    active: false,
  },
  {
    title: "Tournament",
    status: "Coming soon",
    summary: "Bracket drama, quick turnarounds, and neutral-floor pressure.",
    active: false,
  },
  {
    title: "Program Builder",
    status: "On deck",
    summary: "Recruiting pipelines, identity choices, and school legacy systems.",
    active: false,
  },
];

const BUILD_NOTES = [
  "Broadcast camera and tempo controls are live in-game.",
  "Postgame box score and phase overlays are wired into the sim.",
  "Menu flow now supports a full pause menu instead of a raw HUD only state.",
];

const SUPPORT_RIBBON = [
  "Broadcast camera deck",
  "Live pace control",
  "Bench-style pause menu",
];

export default function MainMenu() {
  const startExhibition = useGameStore((s) => s.startExhibition);
  const homeTeam = useGameStore((s) => s.homeTeam);
  const awayTeam = useGameStore((s) => s.awayTeam);

  const homeProfile = getTeamProfile(homeTeam);
  const awayProfile = getTeamProfile(awayTeam);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07111b] text-white">
      <BackgroundLayers />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1560px] flex-col px-5 py-5 sm:px-8 sm:py-7 lg:px-10 xl:px-12">
        <header className="polish-rise flex flex-col gap-4 pb-4 lg:flex-row lg:items-end lg:justify-between lg:pb-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.45em] text-cyan-200/70">
              CollegeBall
            </div>
            <h1 className="mt-3 max-w-3xl text-5xl font-black uppercase leading-[0.88] tracking-[0.04em] text-white sm:text-6xl xl:text-[5.25rem]">
              Saturday Night
              <br />
              Bench Control
            </h1>
          </div>

          <div className="max-w-md lg:pb-2">
            <p className="text-sm uppercase tracking-[0.32em] text-white/42">
              Sim-first college basketball prototype
            </p>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Cleaned for a front-end feel: stronger hierarchy, wider spacing,
              and a calmer menu rhythm around the matchup and game controls.
            </p>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-5 py-4 lg:gap-6 lg:py-5">
          <section className="grid flex-1 gap-5 xl:grid-cols-[1.16fr_0.84fr]">
            <div className="polish-rise polish-delay-1 relative flex flex-col justify-between overflow-hidden rounded-[40px] border border-white/10 bg-[linear-gradient(135deg,rgba(6,14,23,0.96),rgba(5,10,18,0.82))] px-6 py-7 shadow-[0_34px_120px_rgba(0,0,0,0.34)] sm:px-8 sm:py-9 xl:px-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_34%),radial-gradient(circle_at_80%_78%,rgba(245,158,11,0.12),transparent_26%)]" />
              <div className="relative">
                <div className="inline-flex rounded-full border border-cyan-200/15 bg-cyan-300/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-cyan-100/78">
                  Featured Matchup
                </div>

                <div className="mt-8 max-w-2xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.42em] text-white/40">
                    Tonight's floor
                  </p>
                  <h2 className="mt-4 max-w-2xl text-3xl font-black uppercase leading-[0.95] tracking-[0.05em] text-white sm:text-4xl xl:text-[3.3rem]">
                    Set the pace,
                    <br />
                    call the angles,
                    <br />
                    own the sideline.
                  </h2>
                  <p className="mt-5 max-w-xl text-base leading-7 text-white/70 sm:text-lg">
                    Drop into a full exhibition with broadcast presentation,
                    fast control of tempo, and a cleaner bench-command flow once
                    the game is underway.
                  </p>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    onClick={startExhibition}
                    className="rounded-full bg-amber-300 px-8 py-3.5 text-sm font-black uppercase tracking-[0.2em] text-slate-950 transition hover:bg-amber-200"
                  >
                    Start Exhibition
                  </button>
                  <button
                    disabled
                    className="rounded-full border border-white/12 bg-white/5 px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] text-white/42"
                    title="Season flow is still in development"
                  >
                    Season Hub
                  </button>
                </div>

                <div className="mt-10 flex flex-wrap gap-2">
                  {SUPPORT_RIBBON.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="relative mt-12 grid gap-4 lg:grid-cols-[1fr_1fr]">
                <FeatureStrip
                  eyebrow="Support"
                  title="Mode Stack"
                  copy="Exhibition stays in focus while the next layers remain visible and believable."
                />
                <FeatureStrip
                  eyebrow="Detail"
                  title="Game Menu"
                  copy="The in-game overlay now feels like a huddle, not a loose set of buttons."
                />
              </div>
            </div>

            <div className="polish-rise polish-delay-2 flex flex-col gap-5">
              <MatchupStage
                homeTeam={homeTeam}
                awayTeam={awayTeam}
                homeProfile={homeProfile}
                awayProfile={awayProfile}
              />

              <div className="grid gap-3 lg:grid-cols-2">
                {MODE_CARDS.map((mode) => (
                  <ModeCard
                    key={mode.title}
                    title={mode.title}
                    status={mode.status}
                    summary={mode.summary}
                    active={mode.active}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="polish-rise polish-delay-3 grid gap-5 border-t border-white/8 pt-5 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[28px] border border-white/10 bg-black/14 p-6 backdrop-blur-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.38em] text-white/42">
                Prototype Notes
              </div>
              <div className="mt-4 space-y-2.5 text-sm leading-6 text-white/68">
                {BUILD_NOTES.map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <StatPanel label="Home overall" value={homeProfile.overall} />
              <StatPanel label="Away overall" value={awayProfile.overall} />
              <StatPanel label="Control note" value="Esc = Game Menu" />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

interface MatchupStageProps {
  homeTeam: Team;
  awayTeam: Team;
  homeProfile: TeamProfile;
  awayProfile: TeamProfile;
}

function MatchupStage({
  homeTeam,
  awayTeam,
  homeProfile,
  awayProfile,
}: MatchupStageProps) {
  return (
    <section className="relative overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(135deg,rgba(8,17,29,0.95),rgba(8,17,29,0.72))] p-6 shadow-[0_32px_100px_rgba(0,0,0,0.36)] sm:p-7">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_40%),radial-gradient(circle_at_bottom,rgba(251,191,36,0.12),transparent_45%)]" />
      <div className="polish-glow absolute right-[10%] top-[10%] h-24 w-24 rounded-full bg-white/[0.04] blur-2xl" />

      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.38em] text-amber-200/72">
              Main Event
            </div>
            <h2 className="mt-2 text-3xl font-black uppercase tracking-[0.08em] text-white sm:text-4xl">
              {homeTeam.abbreviation} vs {awayTeam.abbreviation}
            </h2>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-right backdrop-blur-sm">
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">
              Tip setup
            </div>
            <div className="mt-1 text-sm font-semibold text-white/75">
              Exhibition night
            </div>
          </div>
        </div>

        <div className="mt-7 grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <TeamShowcase team={homeTeam} profile={homeProfile} align="left" />

          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/5 text-2xl font-black uppercase tracking-[0.18em] text-white/75 backdrop-blur-sm">
            VS
          </div>

          <TeamShowcase team={awayTeam} profile={awayProfile} align="right" />
        </div>
      </div>
    </section>
  );
}

interface TeamShowcaseProps {
  team: Team;
  profile: TeamProfile;
  align: "left" | "right";
}

function TeamShowcase({ team, profile, align }: TeamShowcaseProps) {
  const alignmentClass = align === "right" ? "lg:text-right" : "lg:text-left";

  return (
    <div
      className={`rounded-[30px] border border-white/10 px-5 py-5 ${alignmentClass}`}
      style={{
        background: `linear-gradient(135deg, ${team.primaryColor}28, rgba(8, 17, 29, 0.88))`,
      }}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/40">
        {align === "left" ? "Home" : "Away"}
      </div>
      <div className="mt-3 text-4xl font-black uppercase tracking-[0.08em] text-white">
        {team.abbreviation}
      </div>
      <div className="mt-2 text-sm text-white/75">{team.name}</div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MiniMetric label="Overall" value={profile.overall} />
        <MiniMetric label="Offense" value={profile.offense} />
        <MiniMetric label="Defense" value={profile.defense} />
      </div>

      <div className="mt-4 text-xs uppercase tracking-[0.28em] text-white/38">
        Identity
      </div>
      <div className="mt-2 text-sm leading-6 text-white/72">{profile.identity}</div>
    </div>
  );
}

interface ModeCardProps {
  title: string;
  status: string;
  summary: string;
  active: boolean;
}

function ModeCard({ title, status, summary, active }: ModeCardProps) {
  return (
    <article
      className={`rounded-[28px] border p-5 backdrop-blur-sm transition ${
        active
          ? "border-amber-200/20 bg-amber-300/8"
          : "border-white/10 bg-black/16"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/38">
            {status}
          </div>
          <h3 className="mt-2 text-xl font-black uppercase tracking-[0.08em] text-white">
            {title}
          </h3>
        </div>
        <div
          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] ${
            active ? "bg-amber-300 text-slate-950" : "bg-white/7 text-white/55"
          }`}
        >
          {active ? "Live" : "Locked"}
        </div>
      </div>
      <p className="mt-3.5 text-sm leading-6 text-white/68">{summary}</p>
    </article>
  );
}

interface FeatureStripProps {
  eyebrow: string;
  title: string;
  copy: string;
}

function FeatureStrip({ eyebrow, title, copy }: FeatureStripProps) {
  return (
    <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/42">
        {eyebrow}
      </div>
      <div className="mt-3 text-2xl font-black uppercase tracking-[0.08em] text-white">
        {title}
      </div>
      <p className="mt-3 text-sm leading-6 text-white/66">{copy}</p>
    </div>
  );
}

interface StatPanelProps {
  label: string;
  value: string;
}

function StatPanel({ label, value }: StatPanelProps) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-4.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/38">
        {label}
      </div>
      <div className="mt-3 text-2xl font-black uppercase tracking-[0.08em] text-white">
        {value}
      </div>
    </div>
  );
}

interface MiniMetricProps {
  label: string;
  value: string;
}

function MiniMetric({ label, value }: MiniMetricProps) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-black/18 px-4 py-3.5 backdrop-blur-sm">
      <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/35">
        {label}
      </div>
      <div className="mt-2 text-xl font-black uppercase tracking-[0.08em] text-white">
        {value}
      </div>
    </div>
  );
}

function BackgroundLayers() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_34%),linear-gradient(180deg,#07111b_0%,#040a12_100%)]" />
      <div className="absolute inset-x-[-8%] top-[12%] h-[46%] rounded-[50%] border border-white/6" />
      <div className="absolute inset-x-[8%] top-[22%] h-[32%] rounded-[50%] border border-white/5" />
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/5" />
      <div className="absolute left-[8%] top-1/2 h-px w-[84%] bg-white/5" />
      <div className="absolute bottom-[-12%] left-1/2 h-[35vw] w-[35vw] min-h-[240px] min-w-[240px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.14),transparent_62%)] blur-3xl" />
    </>
  );
}

interface TeamProfile {
  overall: string;
  offense: string;
  defense: string;
  identity: string;
}

function getTeamProfile(team: Team): TeamProfile {
  const totals = team.roster.reduce(
    (acc, player) => {
      acc.shooting += player.ratings.shooting;
      acc.passing += player.ratings.passing;
      acc.defense += player.ratings.defense;
      acc.rebounding += player.ratings.rebounding;
      acc.speed += player.ratings.speed;
      return acc;
    },
    { shooting: 0, passing: 0, defense: 0, rebounding: 0, speed: 0 }
  );

  const count = team.roster.length || 1;
  const offense = Math.round((totals.shooting + totals.passing) / (count * 2));
  const defense = Math.round((totals.defense + totals.rebounding) / (count * 2));
  const pace = Math.round(totals.speed / count);
  const overall = Math.round((offense + defense + pace) / 3);

  let identity = "Balanced group that can survive in both half-court and transition possessions.";
  if (offense >= defense + 6) {
    identity = "Shot-making leans ahead of resistance, so this group wants rhythm and quick decisions.";
  } else if (defense >= offense + 6) {
    identity = "Defensive pressure sets the tone, built to grind out stops and own the glass.";
  } else if (pace >= 68) {
    identity = "Plays with real pace, pushing possessions before the defense can fully load up.";
  }

  return {
    overall: `${overall}`,
    offense: `${offense}`,
    defense: `${defense}`,
    identity,
  };
}
