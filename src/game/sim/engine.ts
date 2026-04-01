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
  PlayerGameStats,
} from "../types";
import {
  BASKET_X_HOME,
  BASKET_X_AWAY,
  THREE_POINT_RADIUS,
  clampToCourt,
  distance,
  lerpPosition,
} from "../core/court";

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

/**
 * Default offensive positions in slot-space (relative to half-court centre).
 * Positive x = toward the basket; negative x = toward half-court.
 * `slotToWorld` translates these into world coordinates by adding ±25 ft offset.
 *
 * World positions for home team attacking right (basket at x=43):
 *   slot.x + 25 → world x;  distance from basket = 43 − world x
 *   PG  x=0  → world 25 (18 ft, top of key)
 *   SG  x=-5 → world 20 (23 ft, left wing — 3-point range)
 *   SF  x=-5 → world 20 (23 ft, right wing — 3-point range)
 *   PF  x=10 → world 35 ( 8 ft, left elbow / high post)
 *   C   x=14 → world 39 ( 4 ft, right low post)
 */
const OFFENSE_SLOTS: CourtPosition[] = [
  { x: 0, y: 0 },    // PG – top of key (~18 ft)
  { x: -5, y: -12 }, // SG – left wing  (~23 ft, 3-point range)
  { x: -5, y: 12 },  // SF – right wing (~23 ft, 3-point range)
  { x: 10, y: -5 },  // PF – left elbow / post (~8 ft)
  { x: 14, y: 5 },   // C  – right low post (~4 ft)
];

/**
 * Default defensive positions (fallback when man-to-man matchup is unavailable).
 * Mirrors the offensive slots with 2–3 ft of cushion toward the basket.
 */
const DEFENSE_SLOTS: CourtPosition[] = [
  { x: 2, y: 0 },    // PG matchup – near top of key
  { x: -3, y: -10 }, // SG matchup – wing
  { x: -3, y: 10 },  // SF matchup – wing
  { x: 8, y: -4 },   // PF matchup – elbow area
  { x: 12, y: 4 },   // C  matchup – post area
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

  // Build a lookup from player ID → ratings for quick access
  const ratingsMap = new Map(
    [...homeTeam.roster, ...awayTeam.roster].map((p) => [p.id, p.ratings])
  );

  // Home team attacks RIGHT basket (away basket at x=43)
  homeTeam.lineup.forEach((id, i) => {
    const pos = slotToWorld(OFFENSE_SLOTS[i], true);
    const ratings = ratingsMap.get(id) ?? { speed: 60, shooting: 60, passing: 60, defense: 60, rebounding: 60 };
    players.push({
      id,
      teamId: homeTeam.id,
      position: { ...pos },
      targetPosition: { ...pos },
      hasBall: i === 0, // PG starts with ball
      speedFactor: speedFactorFromRating(ratings.speed),
      ratings,
      fouls: 0,
    });
  });

  // Away team defends on home's offensive half
  awayTeam.lineup.forEach((id, i) => {
    const pos = slotToWorld(DEFENSE_SLOTS[i], true);
    const ratings = ratingsMap.get(id) ?? { speed: 60, shooting: 60, passing: 60, defense: 60, rebounding: 60 };
    players.push({
      id,
      teamId: awayTeam.id,
      position: { ...pos },
      targetPosition: { ...pos },
      hasBall: false,
      speedFactor: speedFactorFromRating(ratings.speed),
      ratings,
      fouls: 0,
    });
  });

  // Initialise per-player stats record for every roster player
  const playerStats: Record<string, PlayerGameStats> = {};
  [...homeTeam.roster, ...awayTeam.roster].forEach((p) => {
    playerStats[p.id] = {
      points: 0,
      fieldGoalsMade: 0,
      fieldGoalsAttempted: 0,
      threesMade: 0,
      threesAttempted: 0,
      freeThrowsMade: 0,
      freeThrowsAttempted: 0,
      rebounds: 0,
      steals: 0,
      fouls: 0,
    };
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
    teamFouls: { home: 0, away: 0 },
    playerStats,
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
const SHOT_CHANCE_PER_SECOND = 0.08; // probability / sec of a shot attempt (base)
const SHOT_FLIGHT_TIME = 0.8; // seconds

/** Maximum make probability for a close-range layup/dunk. */
const MAX_LAYUP_PROBABILITY = 0.72;
/** Maximum make probability for a short mid-range floater (4–10 ft). */
const MAX_SHORT_MIDRANGE_PROBABILITY = 0.65;
/** Floor make probability for any shot, regardless of distance or contest. */
const MIN_SHOT_PROBABILITY = 0.05;
/** Additional probability penalty per foot beyond the deep-three threshold. */
const DEEP_THREE_PENALTY_PER_FOOT = 0.01;

// ── Free throw constants ──────────────────────────────────────────────────────

/** Minimum free throw make rate (at shooting rating 0). */
const MIN_FT_RATE = 0.55;
/** Additional FT make rate contributed by shooting rating (linear, at rating 100). */
const FT_RATING_FACTOR = 0.30;
/** Hard cap on free throw make rate. */
const MAX_FT_RATE = 0.85;

// ── Foul constants ────────────────────────────────────────────────────────────

/** Defender must be within this distance (ft) to risk a shooting foul. */
const SHOOTING_FOUL_RANGE_FT = 4.5;
/** Base foul chance when a shot is made and a defender is maximally close (and-1). */
const AND_ONE_FOUL_BASE_CHANCE = 0.04;
/** Base foul chance when a shot is missed and a defender is maximally close. */
const MISSED_SHOT_FOUL_BASE_CHANCE = 0.11;

/**
 * Convert a speed rating (0–100) into a speed factor.
 * Rating 50 → factor 1.0; rating 0 → 0.4; rating 100 → 1.6.
 */
function speedFactorFromRating(rating: number): number {
  return 0.4 + (rating / 100) * 1.2;
}

/**
 * Compute base make-probability from a shooting rating (0–100).
 * Rating 50 → ~0.39, rating 75 → ~0.47, rating 100 → 0.55.
 */
function baseMakeProb(shootingRating: number): number {
  return 0.22 + (shootingRating / 100) * 0.33;
}

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

/**
 * Find the most open teammate (furthest from the nearest defender).
 * Falls back to a random pick if everyone is equally covered.
 */
function findOpenTeammate(players: SimPlayer[], selfId: string, teamId: string): SimPlayer | null {
  const teammates = players.filter((p) => p.teamId === teamId && p.id !== selfId);
  if (teammates.length === 0) return null;

  const defenders = players.filter((p) => p.teamId !== teamId);
  if (defenders.length === 0) {
    return teammates[Math.floor(Math.random() * teammates.length)];
  }

  // Score each teammate by the distance to their nearest defender
  const scored = teammates.map((tm) => {
    const nearestDefDist = Math.min(...defenders.map((d) => distance(d.position, tm.position)));
    return { player: tm, openness: nearestDefDist };
  });

  scored.sort((a, b) => b.openness - a.openness);
  // 80% of the time pick the most open player; otherwise pick randomly from the rest
  // for unpredictability.
  if (scored.length === 1 || Math.random() < 0.8) return scored[0].player;
  const fallbackIdx = 1 + Math.floor(Math.random() * (scored.length - 1));
  return scored[fallbackIdx].player;
}

/** Assign new offensive/defensive targets for all players. */
function assignTargets(
  players: SimPlayer[],
  possessionTeam: PossessionTeam,
  ballHandlerId?: string | null
): void {
  const offTeam = possessionTeam;
  const defTeam: PossessionTeam = possessionTeam === "home" ? "away" : "home";
  const attackRight = possessionTeam === "home";

  const offPlayers = players.filter((p) => p.teamId === offTeam);
  const defPlayers = players.filter((p) => p.teamId === defTeam);

  const basket: CourtPosition = attackRight
    ? { x: BASKET_X_AWAY, y: 0 }
    : { x: BASKET_X_HOME, y: 0 };

  // Offense: move to positional slots with jitter
  offPlayers.forEach((p, i) => {
    // Ball handler drives toward the basket area to create a shot opportunity
    if (p.id === ballHandlerId) {
      // Target a position 6–18 ft from the basket, slightly off-centre
      const driveDepth = 6 + Math.random() * 12;
      const driveX = attackRight
        ? basket.x - driveDepth
        : basket.x + driveDepth;
      p.targetPosition = clampToCourt({ x: driveX, y: (Math.random() - 0.5) * 12 });
      return;
    }

    const slot = OFFENSE_SLOTS[i % OFFENSE_SLOTS.length];
    const jitter: CourtPosition = {
      x: slot.x + (Math.random() - 0.5) * 8,
      y: slot.y + (Math.random() - 0.5) * 6,
    };
    p.targetPosition = slotToWorld(jitter, attackRight);
  });

  // Defense: man-to-man — each defender stays between their matchup and the basket
  defPlayers.forEach((def, i) => {
    const matchup = offPlayers[i % offPlayers.length];
    if (!matchup) {
      // Fallback to old slot-based positioning
      const slot = DEFENSE_SLOTS[i % DEFENSE_SLOTS.length];
      const jitter: CourtPosition = {
        x: slot.x + (Math.random() - 0.5) * 6,
        y: slot.y + (Math.random() - 0.5) * 4,
      };
      def.targetPosition = slotToWorld(jitter, attackRight);
      return;
    }

    // Stay between the matched offensive player and the basket
    const dx = basket.x - matchup.position.x;
    const dy = basket.y - matchup.position.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    // Defender is tighter on the ball handler (closer coverage)
    const isBallHandler = matchup.id === ballHandlerId;
    const guardDist = isBallHandler ? 1.5 + Math.random() * 1 : 3 + Math.random() * 3;

    def.targetPosition = clampToCourt({
      x: matchup.position.x + (dx / len) * guardDist + (Math.random() - 0.5) * 2,
      y: matchup.position.y + (dy / len) * guardDist + (Math.random() - 0.5) * 2,
    });
  });
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
    teamFouls: { ...prev.teamFouls },
    playerStats: Object.fromEntries(
      Object.entries(prev.playerStats).map(([id, s]) => [id, { ...s }])
    ),
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
    assignTargets(state.players, state.possession.team, state.possession.ballHandlerId);
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
        // Half-time: start the second half
        state.gameClock.half = 2;
        state.gameClock.remaining = settings.halfLength;
        state.shotClock.remaining = settings.shotClockLength;
        // Reset team fouls for the new half
        state.teamFouls = { home: 0, away: 0 };
        // Swap possession and hand the ball to the new team's first player
        const newHalfTeam: PossessionTeam =
          state.possession.team === "home" ? "away" : "home";
        state.possession.team = newHalfTeam;
        const newHalfHandler = state.players.find((p) => p.teamId === newHalfTeam);
        if (newHalfHandler) {
          state.players.forEach((p) => (p.hasBall = false));
          newHalfHandler.hasBall = true;
          state.possession.ballHandlerId = newHalfHandler.id;
        }
        _timeSinceLastAction = 0;
        _timeSinceLastTargetAssign = 0;
        ctx.events.push({ type: "half_end", message: "End of 1st half" });
        // Reassign all targets for the new half
        assignTargets(state.players, state.possession.team, state.possession.ballHandlerId);
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

  // Adjust shot chance by shooting rating (higher rating → more willing to shoot)
  const shootingBias = 0.6 + (handler.ratings.shooting / 100) * 0.8;

  // Distance factor: players near the basket shoot far more often than those at
  // half-court.  At 0 ft → 2.0×, at 20 ft → 1.0×, at 40 ft → 0.1× (clamped).
  const basket = state.possession.team === "home"
    ? { x: BASKET_X_AWAY, y: 0 }
    : { x: BASKET_X_HOME, y: 0 };
  const distToBasket = distance(handler.position, basket);
  const distFactor = Math.max(0.1, 1 + (20 - distToBasket) / 20);

  const effectiveShotChance = SHOT_CHANCE_PER_SECOND * shootingBias * distFactor * dt;

  if (_timeSinceLastAction > PASS_INTERVAL_MIN && Math.random() < effectiveShotChance) {
    attemptShot(ctx, handler);
    return;
  }

  // Pass: prefer to pass to the most open teammate
  if (_timeSinceLastAction > PASS_INTERVAL_MIN && Math.random() < 0.3 * dt) {
    const target = findOpenTeammate(state.players, handler.id, handler.teamId);
    if (target) {
      executePass(ctx, handler, target);
    }
  }
}

function attemptShot(ctx: TickContext, shooter: SimPlayer): void {
  const { state } = ctx;
  state.shotInFlight = true;
  shooter.hasBall = false;

  // Record origin before the ball leaves the player's hands
  state._shotOrigin = { ...shooter.position };
  state._shooterId = shooter.id;

  // Ball travels toward the attacking basket
  const basket = state.possession.team === "home"
    ? { x: BASKET_X_AWAY, y: 0 }
    : { x: BASKET_X_HOME, y: 0 };

  state._shotTarget = basket;
  state._shotTimer = SHOT_FLIGHT_TIME;

  // Ball starts at shooter position (arc peak handled in resolveShotInFlight)
  state.ballPosition = { ...shooter.position };
  state.ballHeight = BALL_HELD_HEIGHT;

  _timeSinceLastAction = 0;
}

/**
 * Resolve `count` free throw attempts for `shooter`.
 * Free-throw percentage is derived from the shooter's shooting rating:
 *   rating 0 → 55 %; rating 50 → 70 %; rating 100 → 85 %.
 * Score and player stats are updated in place on `ctx.state`.
 */
function resolveFreeThrows(
  ctx: TickContext,
  shooter: SimPlayer,
  count: number,
  shootingTeam: PossessionTeam
): void {
  const { state } = ctx;
  const ftRate = Math.min(MAX_FT_RATE, MIN_FT_RATE + (shooter.ratings.shooting / 100) * FT_RATING_FACTOR);

  for (let i = 0; i < count; i++) {
    const made = Math.random() < ftRate;
    if (state.playerStats[shooter.id]) {
      state.playerStats[shooter.id].freeThrowsAttempted += 1;
      if (made) {
        state.playerStats[shooter.id].freeThrowsMade += 1;
        state.playerStats[shooter.id].points += 1;
      }
    }
    if (made) {
      if (shootingTeam === "home") state.score.home += 1;
      else state.score.away += 1;
    }
    ctx.events.push({
      type: made ? "free_throw_made" : "free_throw_missed",
      playerId: shooter.id,
      teamId: shootingTeam,
      points: made ? 1 : 0,
      message: made ? "Free throw good!" : "Free throw missed.",
    });
  }
}

function resolveShotInFlight(ctx: TickContext): void {
  const { state, dt, settings } = ctx;
  const target = state._shotTarget;
  const timer = state._shotTimer ?? 0;
  const origin = state._shotOrigin;

  if (!target || !origin) {
    state.shotInFlight = false;
    return;
  }

  const newTimer = timer - dt;
  state._shotTimer = newTimer;

  // Animate ball along a clean arc from origin → basket
  const t = 1 - Math.max(0, newTimer / SHOT_FLIGHT_TIME); // 0 at release, 1 at basket
  state.ballPosition = lerpPosition(origin, target, t);
  state.ballHeight = BALL_HELD_HEIGHT + Math.sin(t * Math.PI) * 10; // arc peaks ~13.5 ft

  if (newTimer <= 0) {
    // Shot has arrived — resolve make/miss
    state.shotInFlight = false;
    state._shotTarget = undefined;
    state._shotTimer = undefined;
    state._shotOrigin = undefined;

    // Look up shooter ratings (shooter may have moved, that's fine)
    const shooter = state.players.find((p) => p.id === state._shooterId);
    state._shooterId = undefined;

    // Base probability driven by shooter's shooting rating
    const shooterRating = shooter?.ratings.shooting ?? 65;
    let makeProb = baseMakeProb(shooterRating);

    // Defensive contest: nearest defender within 10 ft reduces make probability.
    // We also save nearestDef for foul detection below.
    const defTeam = state.possession.team === "home" ? "away" : "home";
    const defenders = state.players.filter((p) => p.teamId === defTeam);
    let nearestDef: { player: SimPlayer; dist: number } | null = null;
    if (defenders.length > 0 && shooter) {
      nearestDef = defenders.reduce((best, d) => {
        const dist = distance(d.position, shooter.position);
        return dist < best.dist ? { player: d, dist } : best;
      }, { player: defenders[0], dist: Infinity });

      if (nearestDef.dist < 10) {
        // A 100-rated defender at 0 ft cuts make probability by 30% (multiplier 0.7);
        // effect scales linearly with defender rating and proximity.
        const contestStrength = (nearestDef.player.ratings.defense / 100) * 0.3;
        const proxFactor = Math.max(0, 1 - nearestDef.dist / 10);
        makeProb *= 1 - contestStrength * proxFactor;
      }
    }

    // 3-point detection: use origin distance to basket (not ball's current position)
    const shotDist = distance(origin, target);
    const isThreePointer = shotDist > THREE_POINT_RADIUS;

    // Distance modifier: close-range shots go in at a higher clip; deep shots are harder.
    //   < 4 ft  (layup / dunk area):  +0.15
    //   4–10 ft (short mid-range / floater): +0.06
    //   > THREE_POINT_RADIUS + 4 ft (deep three): −1 % per extra ft, min 5 %
    if (shotDist < 4) {
      makeProb = Math.min(MAX_LAYUP_PROBABILITY, makeProb + 0.15);
    } else if (shotDist < 10) {
      makeProb = Math.min(MAX_SHORT_MIDRANGE_PROBABILITY, makeProb + 0.06);
    } else if (shotDist > THREE_POINT_RADIUS + 4) {
      makeProb = Math.max(MIN_SHOT_PROBABILITY, makeProb - (shotDist - THREE_POINT_RADIUS - 4) * DEEP_THREE_PENALTY_PER_FOOT);
    }

    // Track field-goal attempt in stats
    if (shooter && state.playerStats[shooter.id]) {
      state.playerStats[shooter.id].fieldGoalsAttempted += 1;
      if (isThreePointer) state.playerStats[shooter.id].threesAttempted += 1;
    }

    const made = Math.random() < makeProb;

    // ── Shooting foul detection ─────────────────────────────────────────────
    // A defender very close to the shooter (within FOUL_RANGE_FT) who still
    // has personal fouls remaining has a chance to commit a shooting foul.
    let isFouled = false;
    let fouler: SimPlayer | undefined;
    if (shooter && nearestDef && nearestDef.dist < SHOOTING_FOUL_RANGE_FT && nearestDef.player.fouls < 5) {
      const proximity = 1 - nearestDef.dist / SHOOTING_FOUL_RANGE_FT;
      // Fouls are more likely on contested close shots than on pull-up jumpers.
      // And-1 fouls (made + foul) are intentionally rare.
      const baseFoulChance = made ? AND_ONE_FOUL_BASE_CHANCE : MISSED_SHOT_FOUL_BASE_CHANCE;
      const foulChance = baseFoulChance * (nearestDef.player.ratings.defense / 100) * proximity;
      if (Math.random() < foulChance) {
        isFouled = true;
        fouler = nearestDef.player;
      }
    }

    if (isFouled && fouler && shooter) {
      // Commit the foul
      fouler.fouls += 1;
      const foulerTeam = fouler.teamId as PossessionTeam;
      state.teamFouls[foulerTeam] += 1;
      if (state.playerStats[fouler.id]) {
        state.playerStats[fouler.id].fouls += 1;
      }
      ctx.events.push({
        type: "foul",
        playerId: fouler.id,
        teamId: foulerTeam,
        message: fouler.fouls >= 5 ? "Foul — player fouled out!" : "Shooting foul!",
      });

      if (made) {
        // And-1: basket counts + 1 free throw
        const pts = isThreePointer ? 3 : 2;
        if (state.possession.team === "home") state.score.home += pts;
        else state.score.away += pts;
        if (state.playerStats[shooter.id]) {
          state.playerStats[shooter.id].points += pts;
          state.playerStats[shooter.id].fieldGoalsMade += 1;
          if (isThreePointer) state.playerStats[shooter.id].threesMade += 1;
        }
        ctx.events.push({
          type: "shot_made",
          playerId: shooter.id,
          teamId: state.possession.team,
          points: pts,
          message: `${pts}-pt AND ONE!`,
        });
        resolveFreeThrows(ctx, shooter, 1, state.possession.team);
      } else {
        // Missed shot + foul: award free throws (2 for 2-pt attempt, 3 for 3-pt attempt)
        ctx.events.push({
          type: "shot_missed",
          teamId: state.possession.team,
          message: "Shot missed — shooting foul!",
        });
        resolveFreeThrows(ctx, shooter, isThreePointer ? 3 : 2, state.possession.team);
      }

      // After FTs the defending team inbounds — treat as a possession change
      changePossession(ctx);
      state.shotClock.remaining = settings.shotClockLength;
      return;
    }

    // ── No foul: normal shot resolution ─────────────────────────────────────
    if (made) {
      const pts = isThreePointer ? 3 : 2;
      if (state.possession.team === "home") state.score.home += pts;
      else state.score.away += pts;
      if (shooter && state.playerStats[shooter.id]) {
        state.playerStats[shooter.id].points += pts;
        state.playerStats[shooter.id].fieldGoalsMade += 1;
        if (isThreePointer) state.playerStats[shooter.id].threesMade += 1;
      }
      ctx.events.push({
        type: "shot_made",
        playerId: shooter?.id,
        teamId: state.possession.team,
        points: pts,
        message: `${pts}-point basket!`,
      });
      // Made basket → change possession, reset shot clock
      changePossession(ctx);
      state.shotClock.remaining = settings.shotClockLength;
    } else {
      ctx.events.push({
        type: "shot_missed",
        teamId: state.possession.team,
        message: "Shot missed!",
      });
      // Missed shot → contest the rebound
      resolveRebound(ctx, target);
    }
  }
}

/**
 * Award a rebound after a missed shot.
 * The ball lands near the basket; the closest player (weighted by rebounding
 * rating) wins possession.  Offensive rebound keeps possession; defensive
 * rebound changes it.
 */
function resolveRebound(ctx: TickContext, basketPos: CourtPosition): void {
  const { state, settings } = ctx;

  // Rebound lands randomly close to the basket
  const reboundPos: CourtPosition = clampToCourt({
    x: basketPos.x + (Math.random() - 0.5) * 8,
    y: basketPos.y + (Math.random() - 0.5) * 6,
  });

  // Score each player: lower is better (closer + higher rebounding rating wins)
  const scored = state.players.map((p) => {
    const dist = distance(p.position, reboundPos);
    // Each 10 rating points above 50 reduces effective distance by 1 ft
    const ratingBonus = (p.ratings.rebounding - 50) * 0.1;
    return { player: p, score: dist - ratingBonus };
  });

  scored.sort((a, b) => a.score - b.score);
  const rebounder = scored[0].player;

  // Assign ball to rebounder
  state.players.forEach((p) => (p.hasBall = false));
  rebounder.hasBall = true;

  if (state.playerStats[rebounder.id]) {
    state.playerStats[rebounder.id].rebounds += 1;
  }

  const isOffensiveRebound = rebounder.teamId === state.possession.team;

  if (isOffensiveRebound) {
    // Offensive rebound: same team keeps possession, shot clock resets
    state.possession.ballHandlerId = rebounder.id;
    state.shotClock.remaining = settings.shotClockLength;
    _timeSinceLastAction = 0;
    ctx.events.push({
      type: "rebound",
      playerId: rebounder.id,
      teamId: rebounder.teamId,
      message: "Offensive rebound!",
    });
  } else {
    // Defensive rebound: possession changes
    state.possession.team = rebounder.teamId as PossessionTeam;
    state.possession.ballHandlerId = rebounder.id;
    state.shotClock.remaining = settings.shotClockLength;
    _timeSinceLastAction = 0;
    _timeSinceLastTargetAssign = 0;
    assignTargets(state.players, rebounder.teamId as PossessionTeam, rebounder.id);
    ctx.events.push({
      type: "rebound",
      playerId: rebounder.id,
      teamId: rebounder.teamId,
      message: "Defensive rebound!",
    });
    ctx.events.push({
      type: "possession_change",
      message: `${rebounder.teamId} ball`,
    });
  }
}

function executePass(ctx: TickContext, from: SimPlayer, to: SimPlayer): void {
  const { state } = ctx;

  // Check for steal: a defender near the passing lane may intercept
  const defTeam = from.teamId === "home" ? "away" : "home";
  const defenders = state.players.filter((p) => p.teamId === defTeam);

  const laneMid: CourtPosition = {
    x: (from.position.x + to.position.x) / 2,
    y: (from.position.y + to.position.y) / 2,
  };

  if (defenders.length > 0) {
    const nearestDef = defenders.reduce((best, d) => {
      const dist = distance(d.position, laneMid);
      return dist < best.dist ? { player: d, dist } : best;
    }, { player: defenders[0], dist: Infinity });

    if (nearestDef.dist < 8) {
      // Steal probability: increases with defender's defense rating and proximity;
      // decreases with the passer's passing rating.
      const proximity = Math.max(0, 1 - nearestDef.dist / 8);
      const defSkill = nearestDef.player.ratings.defense / 100;
      const passSkill = from.ratings.passing / 100;
      const stealChance = 0.15 * defSkill * proximity * (1 - passSkill * 0.5);

      if (Math.random() < stealChance) {
        from.hasBall = false;
        nearestDef.player.hasBall = true;
        state.possession.team = nearestDef.player.teamId as PossessionTeam;
        state.possession.ballHandlerId = nearestDef.player.id;
        state.shotClock.remaining = ctx.settings.shotClockLength;
        _timeSinceLastAction = 0;
        _timeSinceLastTargetAssign = 0;
        assignTargets(state.players, nearestDef.player.teamId as PossessionTeam, nearestDef.player.id);

        if (state.playerStats[nearestDef.player.id]) {
          state.playerStats[nearestDef.player.id].steals += 1;
        }

        ctx.events.push({
          type: "steal",
          playerId: nearestDef.player.id,
          teamId: nearestDef.player.teamId,
          message: "Steal!",
        });
        ctx.events.push({
          type: "possession_change",
          message: `${nearestDef.player.teamId} ball`,
        });
        return;
      }
    }
  }

  // No steal: complete the pass
  from.hasBall = false;
  to.hasBall = true;
  state.possession.ballHandlerId = to.id;
  _timeSinceLastAction = 0;

  ctx.events.push({
    type: "pass",
    playerId: from.id,
    message: "Pass",
  });
}

function changePossession(ctx: TickContext): void {
  const { state, settings } = ctx;
  const newTeam: PossessionTeam = state.possession.team === "home" ? "away" : "home";
  state.possession.team = newTeam;
  state.shotClock.remaining = settings.shotClockLength;
  _timeSinceLastAction = 0;
  _timeSinceLastTargetAssign = 0;

  // Hand ball to the first player of the new team
  const newHandler = state.players.find((p) => p.teamId === newTeam);
  if (newHandler) {
    state.players.forEach((p) => (p.hasBall = false));
    newHandler.hasBall = true;
    state.possession.ballHandlerId = newHandler.id;
  }

  // Reassign targets for the new possession
  assignTargets(state.players, newTeam, state.possession.ballHandlerId);

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
