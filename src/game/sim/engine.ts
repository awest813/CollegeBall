/**
 * Basketball Simulation Engine
 *
 * This is the heart of the game. It is completely framework-agnostic:
 * no Babylon, no React, no DOM. It takes a state snapshot, advances it
 * by `dt` seconds, and returns the new state plus any events.
 *
 * Architecture:
 *   • The engine is a pure-ish function: `tick(state, dt) → state`
 *   • Side effects (rendering, UI updates) happen elsewhere
 *   • Randomness is intentional but will later be seeded for replays
 */

import type {
  SimulationState,
  SimPlayer,
  CourtPosition,
  PossessionTeam,
  SimEvent,
  Team,
  GameSettings,
} from "../types";
import {
  BASKET_X_HOME,
  BASKET_X_AWAY,
  clampToCourt,
  distance,
} from "../core/court";

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

/** Default offensive positions relative to the basket (in the offensive half). */
const OFFENSE_SLOTS: CourtPosition[] = [
  { x: 0, y: 0 }, // PG – top of key
  { x: -8, y: -12 }, // SG – left wing
  { x: -8, y: 12 }, // SF – right wing
  { x: -16, y: -6 }, // PF – left block
  { x: -16, y: 6 }, // C – right block
];

const DEFENSE_SLOTS: CourtPosition[] = [
  { x: 2, y: 0 },
  { x: -6, y: -10 },
  { x: -6, y: 10 },
  { x: -14, y: -5 },
  { x: -14, y: 5 },
];

function flipX(pos: CourtPosition): CourtPosition {
  return { x: -pos.x, y: pos.y };
}

/** Translate a slot so it's on the correct side of the court. */
function slotToWorld(
  slot: CourtPosition,
  attackingRight: boolean
): CourtPosition {
  const base = attackingRight ? slot : flipX(slot);
  const offsetX = attackingRight ? 25 : -25;
  return clampToCourt({ x: base.x + offsetX, y: base.y });
}

/** Build the initial SimulationState for the start of a game. */
export function createInitialSimState(
  homeTeam: Team,
  awayTeam: Team,
  settings: GameSettings
): SimulationState {
  const players: SimPlayer[] = [];

  // Home team attacks RIGHT basket (away basket at x=43)
  homeTeam.lineup.forEach((id, i) => {
    const pos = slotToWorld(OFFENSE_SLOTS[i], true);
    players.push({
      id,
      teamId: homeTeam.id,
      position: { ...pos },
      targetPosition: { ...pos },
      hasBall: i === 0, // PG starts with ball
      speedFactor: 1,
    });
  });

  // Away team defends on home's offensive half
  awayTeam.lineup.forEach((id, i) => {
    const pos = slotToWorld(DEFENSE_SLOTS[i], true);
    players.push({
      id,
      teamId: awayTeam.id,
      position: { ...pos },
      targetPosition: { ...pos },
      hasBall: false,
      speedFactor: 1,
    });
  });

  const ballHandler = players[0];

  return {
    players,
    ballPosition: { ...ballHandler.position },
    ballHeight: 3.5, // held at waist height
    possession: { team: "home", ballHandlerId: ballHandler.id },
    gameClock: { remaining: settings.halfLength, half: 1, running: true },
    shotClock: { remaining: settings.shotClockLength, running: true },
    score: { home: 0, away: 0 },
    shotInFlight: false,
    events: [],
  };
}

// ---------------------------------------------------------------------------
// Tick helpers
// ---------------------------------------------------------------------------

const PLAYER_SPEED = 18; // ft/s base speed
const BALL_HELD_HEIGHT = 3.5;
const PASS_INTERVAL_MIN = 1.5; // seconds between passes at minimum
const SHOT_CHANCE_PER_SECOND = 0.08; // probability / sec of a shot attempt
const MAKE_PROBABILITY = 0.42;

/** Move a player toward their target. Returns new position. */
function moveToward(
  current: CourtPosition,
  target: CourtPosition,
  speed: number,
  dt: number
): CourtPosition {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.2) return { ...target };
  const step = Math.min(speed * dt, dist);
  return clampToCourt({
    x: current.x + (dx / dist) * step,
    y: current.y + (dy / dist) * step,
  });
}

/** Pick a random teammate (not self). */
function randomTeammate(players: SimPlayer[], selfId: string, teamId: string): SimPlayer | null {
  const teammates = players.filter((p) => p.teamId === teamId && p.id !== selfId);
  if (teammates.length === 0) return null;
  return teammates[Math.floor(Math.random() * teammates.length)];
}

/** Assign new offensive/defensive targets for all players. */
function assignTargets(
  players: SimPlayer[],
  possessionTeam: PossessionTeam
): void {
  const offTeam = possessionTeam === "home" ? "home" : "away";
  const defTeam = possessionTeam === "home" ? "away" : "home";
  const attackRight = possessionTeam === "home";

  let offIdx = 0;
  let defIdx = 0;

  for (const p of players) {
    if (p.teamId === offTeam) {
      // Add randomness to slots so movement isn't static
      const slot = OFFENSE_SLOTS[offIdx % OFFENSE_SLOTS.length];
      const jitter: CourtPosition = {
        x: slot.x + (Math.random() - 0.5) * 8,
        y: slot.y + (Math.random() - 0.5) * 6,
      };
      p.targetPosition = slotToWorld(jitter, attackRight);
      offIdx++;
    } else if (p.teamId === defTeam) {
      const slot = DEFENSE_SLOTS[defIdx % DEFENSE_SLOTS.length];
      const jitter: CourtPosition = {
        x: slot.x + (Math.random() - 0.5) * 6,
        y: slot.y + (Math.random() - 0.5) * 4,
      };
      p.targetPosition = slotToWorld(jitter, attackRight);
      defIdx++;
    }
  }
}

// ---------------------------------------------------------------------------
// Main tick
// ---------------------------------------------------------------------------

/** Mutable accumulator passed through sub-steps. */
interface TickContext {
  state: SimulationState;
  dt: number;
  events: SimEvent[];
  settings: GameSettings;
  /** Accumulated time since last pass — used to gate pass frequency. */
  timeSinceLastAction: number;
}

let _timeSinceLastAction = 0;
let _timeSinceLastTargetAssign = 0;

/**
 * Advance the simulation by `dt` seconds.
 * Returns a new SimulationState (the old one is not mutated — we clone first).
 */
export function tick(
  prev: SimulationState,
  dt: number,
  settings: GameSettings
): SimulationState {
  // Deep-ish clone of mutable bits
  const state: SimulationState = {
    ...prev,
    players: prev.players.map((p) => ({ ...p, position: { ...p.position }, targetPosition: { ...p.targetPosition } })),
    ballPosition: { ...prev.ballPosition },
    possession: { ...prev.possession },
    gameClock: { ...prev.gameClock },
    shotClock: { ...prev.shotClock },
    score: { ...prev.score },
    events: [],
  };

  const ctx: TickContext = { state, dt, events: [], settings, timeSinceLastAction: _timeSinceLastAction };
  _timeSinceLastAction += dt;
  _timeSinceLastTargetAssign += dt;

  // 1) Clocks
  tickClocks(ctx);

  // 2) If game/half ended, stop here
  if (!state.gameClock.running) {
    state.events = ctx.events;
    return state;
  }

  // 3) Reassign movement targets periodically
  if (_timeSinceLastTargetAssign > 2.5) {
    assignTargets(state.players, state.possession.team);
    _timeSinceLastTargetAssign = 0;
  }

  // 4) Shot in flight resolution
  if (state.shotInFlight) {
    resolveShotInFlight(ctx);
  } else {
    // 5) Ball-handler AI: pass or shoot
    tickBallHandler(ctx);
  }

  // 6) Move all players toward targets
  tickMovement(ctx);

  // 7) Update ball position to follow handler or flight arc
  tickBallPosition(ctx);

  state.events = ctx.events;
  return state;
}

// ---------------------------------------------------------------------------
// Sub-steps
// ---------------------------------------------------------------------------

function tickClocks(ctx: TickContext): void {
  const { state, dt, settings } = ctx;

  if (state.gameClock.running) {
    state.gameClock.remaining = Math.max(0, state.gameClock.remaining - dt);
    if (state.gameClock.remaining <= 0) {
      if (state.gameClock.half === 1) {
        // Half-time
        state.gameClock.half = 2;
        state.gameClock.remaining = settings.halfLength;
        state.shotClock.remaining = settings.shotClockLength;
        // Swap possession
        state.possession.team = state.possession.team === "home" ? "away" : "home";
        ctx.events.push({ type: "half_end", message: "End of 1st half" });
        // Reassign all targets for the new half
        assignTargets(state.players, state.possession.team);
      } else {
        state.gameClock.running = false;
        state.shotClock.running = false;
        ctx.events.push({ type: "game_end", message: "Game over!" });
        return;
      }
    }
  }

  if (state.shotClock.running) {
    state.shotClock.remaining = Math.max(0, state.shotClock.remaining - dt);
    if (state.shotClock.remaining <= 0) {
      // Shot clock violation — turnover
      ctx.events.push({ type: "shot_clock_violation", message: "Shot clock violation!" });
      changePossession(ctx);
    }
  }
}

function tickBallHandler(ctx: TickContext): void {
  const { state, dt } = ctx;
  const handler = state.players.find((p) => p.id === state.possession.ballHandlerId);
  if (!handler) return;

  // Decide: shoot or pass
  const shootRoll = Math.random();
  if (_timeSinceLastAction > PASS_INTERVAL_MIN && shootRoll < SHOT_CHANCE_PER_SECOND * dt) {
    // Attempt a shot
    attemptShot(ctx, handler);
    return;
  }

  // Decide: pass
  if (_timeSinceLastAction > PASS_INTERVAL_MIN && Math.random() < 0.3 * dt) {
    const target = randomTeammate(state.players, handler.id, handler.teamId);
    if (target) {
      executePass(ctx, handler, target);
    }
  }
}

function attemptShot(ctx: TickContext, shooter: SimPlayer): void {
  const { state } = ctx;
  state.shotInFlight = true;
  shooter.hasBall = false;

  // Ball goes toward the basket
  const basket = state.possession.team === "home"
    ? { x: BASKET_X_AWAY, y: 0 }
    : { x: BASKET_X_HOME, y: 0 };
  state.ballPosition = { ...shooter.position };
  state.ballHeight = 8; // arc peak

  state._shotTarget = basket;
  state._shotTimer = 0.8; // flight time in seconds

  _timeSinceLastAction = 0;
}

function resolveShotInFlight(ctx: TickContext): void {
  const { state, dt, settings } = ctx;
  const target = state._shotTarget;
  const timer = state._shotTimer ?? 0;

  if (!target) {
    state.shotInFlight = false;
    return;
  }

  const newTimer = timer - dt;
  state._shotTimer = newTimer;

  // Animate ball toward basket
  const t = 1 - Math.max(0, newTimer / 0.8);
  state.ballPosition = {
    x: state.ballPosition.x + (target.x - state.ballPosition.x) * t * 0.1,
    y: state.ballPosition.y + (target.y - state.ballPosition.y) * t * 0.1,
  };
  state.ballHeight = 8 + Math.sin(t * Math.PI) * 4; // arc

  if (newTimer <= 0) {
    // Resolve shot
    state.shotInFlight = false;
    state._shotTarget = undefined;
    state._shotTimer = undefined;

    const made = Math.random() < MAKE_PROBABILITY;
    if (made) {
      const pts = distance(state.ballPosition, target) > 20 ? 3 : 2;
      if (state.possession.team === "home") state.score.home += pts;
      else state.score.away += pts;
      ctx.events.push({
        type: "shot_made",
        message: `${pts}-point basket!`,
        points: pts,
        teamId: state.possession.team,
      });
    } else {
      ctx.events.push({
        type: "shot_missed",
        message: "Shot missed!",
        teamId: state.possession.team,
      });
    }

    // After any shot, change possession
    changePossession(ctx);
    state.shotClock.remaining = settings.shotClockLength;
  }
}

function executePass(ctx: TickContext, from: SimPlayer, to: SimPlayer): void {
  const { state } = ctx;
  from.hasBall = false;
  to.hasBall = true;
  state.possession.ballHandlerId = to.id;
  _timeSinceLastAction = 0;

  ctx.events.push({
    type: "pass",
    playerId: from.id,
    message: `Pass to #${to.id}`,
  });
}

function changePossession(ctx: TickContext): void {
  const { state, settings } = ctx;
  const newTeam: PossessionTeam = state.possession.team === "home" ? "away" : "home";
  state.possession.team = newTeam;
  state.shotClock.remaining = settings.shotClockLength;

  // Hand ball to the first player of the new team
  const newHandler = state.players.find((p) => p.teamId === newTeam);
  if (newHandler) {
    state.players.forEach((p) => (p.hasBall = false));
    newHandler.hasBall = true;
    state.possession.ballHandlerId = newHandler.id;
  }

  // Reassign targets for the new possession
  assignTargets(state.players, newTeam);

  ctx.events.push({ type: "possession_change", message: `${newTeam} ball` });
}

function tickMovement(ctx: TickContext): void {
  const { state, dt } = ctx;
  for (const p of state.players) {
    const speed = PLAYER_SPEED * p.speedFactor;
    p.position = moveToward(p.position, p.targetPosition, speed, dt);
  }
}

function tickBallPosition(ctx: TickContext): void {
  const { state } = ctx;
  if (state.shotInFlight) return; // ball position handled by shot logic

  const handler = state.players.find((p) => p.id === state.possession.ballHandlerId);
  if (handler) {
    state.ballPosition = { ...handler.position };
    state.ballHeight = BALL_HELD_HEIGHT;
  }
}

/** Reset engine-level accumulators (call when starting a new game). */
export function resetSimEngine(): void {
  _timeSinceLastAction = 0;
  _timeSinceLastTargetAssign = 0;
}
