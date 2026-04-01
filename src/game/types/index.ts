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
  teamId: string;
  position: CourtPosition;
  targetPosition: CourtPosition;
  hasBall: boolean;
  /** Speed multiplier for this tick (0–1+). Derived from the player's speed rating. */
  speedFactor: number;
  /** Player ratings copied from roster data for fast in-sim access. */
  ratings: PlayerRatings;
  /** Personal fouls accumulated this game. Foul out at 5. */
  fouls: number;
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
  steals: number;
  fouls: number;
}

/** The full snapshot produced by the simulation every tick. */
export interface SimulationState {
  players: SimPlayer[];
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
  /** Internal: target basket position for an in-flight shot. */
  _shotTarget?: CourtPosition;
  /** Internal: remaining flight time for a shot. */
  _shotTimer?: number;
  /** Internal: court position where the shot was released (for arc and 3-pt detection). */
  _shotOrigin?: CourtPosition;
  /** Internal: player ID of the shooter (for rating-based resolution). */
  _shooterId?: string;
  /** Event log for the current tick (e.g. "shot_made", "turnover"). */
  events: SimEvent[];
}

export type SimEventType =
  | "shot_made"
  | "shot_missed"
  | "pass"
  | "turnover"
  | "steal"
  | "rebound"
  | "possession_change"
  | "half_end"
  | "game_end"
  | "shot_clock_violation"
  | "foul"
  | "free_throw_made"
  | "free_throw_missed";

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

export type Screen = "menu" | "game";

export type GameSpeed = 1 | 2 | 4;

export type SimStatus = "idle" | "running" | "paused" | "finished";

export interface GameSettings {
  halfLength: number; // seconds per half
  shotClockLength: number; // seconds
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
