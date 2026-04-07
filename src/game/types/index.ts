/**
 * Core type definitions for the basketball simulation.
 *
 * These types are framework-agnostic — they are shared by the simulation engine,
 * the game state store, and the rendering layer. Nothing here should import
 * from Babylon, React, or any UI library.
 */

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/** A 2D position on the court surface (x = sideline, y = baseline). */
export interface CourtPosition {
  x: number;
  y: number;
}

/** A 3D world-space position used by the renderer. */
export interface WorldPosition {
  x: number;
  y: number;
  z: number;
}

// ---------------------------------------------------------------------------
// Players & Teams
// ---------------------------------------------------------------------------

/** Placeholder player ratings — will grow as systems are added. */
export interface PlayerRatings {
  speed: number; // 0–100
  shooting: number; // 0–100
  passing: number; // 0–100
  defense: number; // 0–100
  rebounding: number; // 0–100
  endurance: number; // 0–100: how quickly stamina drains
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  number: number;
  position: PlayerPosition;
  ratings: PlayerRatings;
}

export type PlayerPosition = "PG" | "SG" | "SF" | "PF" | "C";

/** Five player IDs representing the active lineup on the court. */
export type Lineup = [string, string, string, string, string];

export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
  roster: Player[];
  lineup: Lineup;
}

// ---------------------------------------------------------------------------
// Clock & Score
// ---------------------------------------------------------------------------

export interface GameClock {
  /** Remaining seconds in the current half. */
  remaining: number;
  /** Current half (1 or 2). */
  half: 1 | 2;
  /** Is the clock actively counting down? */
  running: boolean;
}

export interface ShotClock {
  /** Remaining seconds on the shot clock. */
  remaining: number;
  running: boolean;
}

export interface ScoreState {
  home: number;
  away: number;
}

// ---------------------------------------------------------------------------
// Possession
// ---------------------------------------------------------------------------

export type PossessionTeam = "home" | "away";

export interface Possession {
  /** Which team has the ball. */
  team: PossessionTeam;
  /** Player ID of the current ball handler (null during loose ball / dead ball). */
  ballHandlerId: string | null;
}

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

/** Per-player state tracked each simulation tick. */
export interface SimPlayer {
  id: string;
  /** Simulation-side team slot, normalized to home/away for deterministic logic. */
  teamId: PossessionTeam;
  /** Roster role index 0–4 (PG→C); used for offensive slots and man-to-man matchups. */
  slotIndex: number;
  /** Jersey number from the roster — used for display purposes (e.g. sub messages). */
  jerseyNumber: number;
  position: CourtPosition;
  targetPosition: CourtPosition;
  hasBall: boolean;
  /** Speed multiplier for this tick (0–1+). Derived from the player's speed rating. */
  speedFactor: number;
  /** Player ratings copied from roster data for fast in-sim access. */
  ratings: PlayerRatings;
  /** Personal fouls accumulated this game. Foul out at 5. */
  fouls: number;
  /** Current stamina (0–100). Drains during play; low stamina penalises speed/shooting. */
  stamina: number;
}

/** Per-player game statistics accumulated over the full game. */
export interface PlayerGameStats {
  points: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  threesMade: number;
  threesAttempted: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  rebounds: number;
  assists: number;
  steals: number;
  /** Lost-ball / bad-pass turnovers (not steals — defender credited separately). */
  turnovers: number;
  /** Blocked field-goal attempts (defensive stat). */
  blocks: number;
  fouls: number;
  /** Minutes on the court while the game clock is running in IN_PLAY. */
  minutesPlayed: number;
}

export type MatchPhase = "PRE_GAME" | "TIP_OFF" | "IN_PLAY" | "HALFTIME" | "OVERTIME" | "FULL_TIME" | "FINISHED";

/** THE full snapshot produced by the simulation every tick. */
export interface SimulationState {
  phase: MatchPhase;
  players: SimPlayer[];
  /** Players on the bench (not currently on court), per team. */
  bench: SimPlayer[];
  ballPosition: CourtPosition;
  /** Height of the ball above the court (for arcs, shots, etc.). */
  ballHeight: number;
  possession: Possession;
  gameClock: GameClock;
  shotClock: ShotClock;
  score: ScoreState;
  /** Per-team foul count for the current half. Resets at halftime. */
  teamFouls: { home: number; away: number };
  /** Per-player game statistics accumulated across the full game. */
  playerStats: Record<string, PlayerGameStats>;
  /** True while a shot is in the air. */
  shotInFlight: boolean;
  /** Current overtime period (0 = regulation, 1 = first OT, 2 = second OT, …). */
  overtimePeriod: number;
  /** Internal: target basket position for an in-flight shot. */
  _shotTarget?: CourtPosition;
  /** Internal: remaining flight time for a shot. */
  _shotTimer?: number;
  /** Internal: court position where the shot was released (for arc and 3-pt detection). */
  _shotOrigin?: CourtPosition;
  /** Internal: player ID of the shooter (for rating-based resolution). */
  _shooterId?: string;
  /** Internal: ID of the player who last completed a pass (for assist attribution). */
  _lastPassFromId?: string;
  /** Internal: accumulated time since last AI action (pass/shoot). */
  _timeSinceLastAction: number;
  /** Internal: accumulated time since last movement target reassignment. */
  _timeSinceLastTargetAssign: number;
  /** Internal: true when the ball handler has a fast-break advantage after a steal or quick transition. */
  _isFastBreak?: boolean;
  /** Internal: per-player consecutive-makes counter for the hot-hand effect. */
  _hotStreak?: Record<string, number>;
  /** Event log for the current tick (e.g. "shot_made", "turnover"). */
  events: SimEvent[];
}

export type SimEventType =
  | "shot_made"
  | "shot_missed"
  | "pass"
  | "turnover"
  | "steal"
  | "block"
  | "rebound"
  | "possession_change"
  | "half_end"
  | "game_end"
  | "shot_clock_violation"
  | "foul"
  | "non_shooting_foul"
  | "substitution"
  | "free_throw_made"
  | "free_throw_missed"
  | "fast_break"
  | "overtime_start";

export interface SimEvent {
  type: SimEventType;
  playerId?: string;
  teamId?: string;
  points?: number;
  message: string;
}

// ---------------------------------------------------------------------------
// Game State (UI-level)
// ---------------------------------------------------------------------------

export type Screen = "menu" | "game" | "season";

export type GameSpeed = 1 | 2 | 4;

export type SimStatus = "idle" | "running" | "paused" | "finished";

export interface GameSettings {
  halfLength: number; // seconds per half
  shotClockLength: number; // seconds
  /** Team foul count at which the opponent earns one-and-one free throws (NCAA: 7). */
  bonusFoulThreshold: number;
  /** Team foul count at which the opponent earns automatic two free throws (NCAA: 10). */
  doubleBonusThreshold: number;
  /** Stamina below this value triggers an automatic substitution (0–100). */
  subStaminaThreshold: number;
  /**
   * When true, the home team receives a small boost to shot percentage and free-throw
   * percentage to simulate home-court crowd energy and familiarity.
   */
  homeCourtBonus: boolean;
  /**
   * Head coach's offensive system rating (0–100).
   * Higher values nudge the home team toward quicker shot decisions and an up-tempo
   * pace.  Defaults to 50 (neutral).
   */
  coachOffense?: number;
  /**
   * Head coach's defensive system rating (0–100).
   * Higher values boost the home team's defensive contest effectiveness.
   * Defaults to 50 (neutral).
   */
  coachDefense?: number;
}

// ---------------------------------------------------------------------------
// Head Coach & Season Mode
// ---------------------------------------------------------------------------

/** Head coach profile. Ratings affect strategic tendencies and team growth. */
export interface Coach {
  id: string;
  firstName: string;
  lastName: string;
  /** Offensive system rating — affects shot selection and pace tendencies. */
  offense: number; // 0–100
  /** Defensive system rating — affects defensive intensity. */
  defense: number; // 0–100
  /** Recruiting rating — affects incoming talent quality. */
  recruiting: number; // 0–100
  /** Player development rating — affects in-season player growth. */
  development: number; // 0–100
}

/** Lightweight opponent descriptor stored within the season schedule. */
export interface SeasonOpponent {
  id: string;
  name: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
  /** Composite quality rating (60–90) used to scale the opponent's generated roster. */
  overall: number;
}

/** One game entry in the season schedule. */
export interface SeasonGame {
  id: string;
  /** Week number in the season (1-based). */
  week: number;
  /** True when the user's team is playing at home. */
  isHome: boolean;
  opponent: SeasonOpponent;
  /** null until the game has been played. */
  result: "win" | "loss" | null;
  /** User team's final score; null until played. */
  userScore: number | null;
  /** Opponent's final score; null until played. */
  opponentScore: number | null;
}

/** Cumulative win/loss record for the season. */
export interface SeasonRecord {
  wins: number;
  losses: number;
}

/** Full season state for head-coach mode. */
export interface Season {
  /** Four-digit season year (e.g. 2025). */
  year: number;
  coach: Coach;
  /** The team you are head-coaching. */
  team: Team;
  schedule: SeasonGame[];
  record: SeasonRecord;
  /** Index into schedule of the next unplayed game. Equals schedule.length when the season is complete. */
  currentGameIndex: number;
  /**
   * Cumulative per-player stats accumulated from games played through the 3D engine.
   * Keyed by player id — same shape as PlayerGameStats but totalled across all games.
   */
  seasonStats: Record<string, PlayerGameStats>;
  /** Number of games fully played through the 3D engine (used to compute per-game averages). */
  gamesPlayedWithStats: number;
}

// ---------------------------------------------------------------------------
// Animation (visual layer — referenced by rendering but defined here for
// shared access across features that may query current anim state)
// ---------------------------------------------------------------------------

export type AnimationStateName =
  | "idle"
  | "jog"
  | "run"
  | "defensive_stance"
  | "shuffle"
  | "dribble_idle"
  | "pass"
  | "shoot"
  | "rebound"
  | "celebrate"
  | "transition";

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------

/**
 * Available in-game camera perspectives.
 *
 *   broadcast – long-sideline TV angle following the ball (default)
 *   overhead   – top-down birds-eye view
 *   endzone    – behind-the-basket angle looking down the court
 */
export type CameraMode = "broadcast" | "overhead" | "endzone";
