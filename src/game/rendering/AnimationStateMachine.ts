/**
 * Animation State Machine for player visual representation.
 *
 * Determines and transitions animation states for each player based on
 * simulation data (speed, ball possession, defending, shot status).
 *
 * When real animation clips become available, the state names and
 * transition logic here remain valid — only the playback layer changes.
 *
 * Procedural motion helpers produce simple mathematical approximations
 * (bob, lean, extend) that make primitive meshes feel alive until clips
 * are plugged in.
 *
 * GLB readiness:
 *   • `blendIn` drives GLB AnimationGroup cross-fade weights (0 → 1 over
 *     `getTransitionDuration(state)` seconds on every state change).
 *   • `prevName` tells the GLB controller which clip to fade out.
 *   • `shooterId` in PlayerAnimContext enables correct shoot-state entry
 *     the moment a shot goes up, without relying on hasBall.
 */

import type { SimPlayer, AnimationStateName, MatchPhase } from "../types";

// Re-export so callers only need to import from this module
export type { AnimationStateName } from "../types";

// ---------------------------------------------------------------------------
// State value object
// ---------------------------------------------------------------------------

export interface AnimationState {
  name: AnimationStateName;
  /** Elapsed seconds in the current state (reset on every transition). */
  elapsed: number;
  /**
   * Blend-in weight for the current state: 0 immediately after a transition,
   * ramping to 1 over `getTransitionDuration(name)` seconds.
   * Used by GLB AnimationGroup cross-fading; also available for procedural
   * motion blending if desired.
   */
  blendIn: number;
  /**
   * State being blended FROM during an active transition.
   * Set to the previous state name on every state change; cleared (null) once
   * `blendIn` reaches 1.  Used by the GLB controller to know which clip to
   * fade out.
   */
  prevName: AnimationStateName | null;
}

export function makeIdleAnimState(): AnimationState {
  return { name: "idle", elapsed: 0, blendIn: 1, prevName: null };
}

// ---------------------------------------------------------------------------
// Transition durations
// ---------------------------------------------------------------------------

/**
 * How long (seconds) the blend-in ramp takes when entering each state.
 * Shorter for action states so they feel snappy; longer for locomotion.
 */
const TRANSITION_DURATIONS: Partial<Record<AnimationStateName, number>> = {
  idle:             0.20,
  jog:              0.18,
  run:              0.15,
  defensive_stance: 0.22,
  shuffle:          0.18,
  dribble_idle:     0.15,
  pass:             0.08,
  shoot:            0.06,
  rebound:          0.10,
  celebrate:        0.20,
  transition:       0.20,
};
const DEFAULT_TRANSITION_DURATION = 0.15;

/**
 * Returns the blend-in duration in seconds when entering the given state.
 * Used by GLB animation controllers to schedule cross-fades and by
 * `tickAnimationState` to drive the `blendIn` ramp.
 */
export function getTransitionDuration(to: AnimationStateName): number {
  return TRANSITION_DURATIONS[to] ?? DEFAULT_TRANSITION_DURATION;
}

// ---------------------------------------------------------------------------
// Context consumed by the resolver
// ---------------------------------------------------------------------------

export interface PlayerAnimContext {
  simPlayer: SimPlayer;
  hasBall: boolean;
  isDefending: boolean;
  /** Computed movement speed in ft/s for the current frame. */
  speed: number;
  shotInFlight: boolean;
  /**
   * Player ID of the current shooter when a shot is in flight.
   * Allows the resolver to enter `shoot` state the moment the ball leaves
   * the shooter's hands, rather than relying on hasBall.
   */
  shooterId?: string;
  /** Current match phase (PRE_GAME, IN_PLAY, etc). */
  phase?: MatchPhase;
  /** True if this player's team won the game. */
  isWinner?: boolean;
}

// ---------------------------------------------------------------------------
// Speed thresholds
// ---------------------------------------------------------------------------

const IDLE_THRESHOLD = 0.8; // ft/s — below this the player is effectively still
const JOG_THRESHOLD  = 10;  // ft/s — below this → jog, above → run

// ---------------------------------------------------------------------------
// State resolution
// ---------------------------------------------------------------------------

/**
 * Determine the desired AnimationStateName from the current context.
 *
 * Priority order:
 *   1. Shooter in-flight    → shoot
 *   2. Shoot follow-through → shoot (hold for 0.45 s after ball leaves)
 *   3. Ball carrier         → dribble_idle | jog | run
 *   4. Defender             → defensive_stance | shuffle | run
 *   5. Off-ball             → idle | jog | run
 *
 * Event-driven states (pass, rebound, celebrate) are injected as overrides
 * in RenderBridge before this function is called, so they do not appear here.
 */
export function resolveAnimationState(
  ctx: PlayerAnimContext,
  current: AnimationState
): AnimationStateName {
  // 0. Match Phase specific overrides
  if (ctx.phase === "FULL_TIME") {
    return ctx.isWinner ? "celebrate" : "idle";
  }
  if (ctx.phase === "PRE_GAME" || ctx.phase === "HALFTIME" || ctx.phase === "FINISHED") {
    return "idle";
  }

  // 1. Shooter: stay in shoot state while the shot is still in the air
  if (ctx.shotInFlight && ctx.shooterId === ctx.simPlayer.id) {
    return "shoot";
  }

  // 2. Follow-through: hold shoot state briefly after the ball has landed
  if (
    current.name === "shoot" &&
    current.elapsed < 0.45 &&
    !ctx.hasBall &&
    !ctx.shotInFlight
  ) {
    return "shoot";
  }

  // 3. Ball carrier
  if (ctx.hasBall) {
    if (ctx.speed < IDLE_THRESHOLD) return "dribble_idle";
    if (ctx.speed < JOG_THRESHOLD)  return "jog";
    return "run";
  }

  // 4. Defender (off-ball, opposing team)
  if (ctx.isDefending) {
    if (ctx.speed < IDLE_THRESHOLD) return "defensive_stance";
    if (ctx.speed < JOG_THRESHOLD)  return "shuffle";
    return "run";
  }

  // 5. Off-ball team-mate
  if (ctx.speed < IDLE_THRESHOLD) return "idle";
  if (ctx.speed < JOG_THRESHOLD)  return "jog";
  return "run";
}

// ---------------------------------------------------------------------------
// State tick  (transition + elapsed time + blend-in ramp)
// ---------------------------------------------------------------------------

/**
 * Advance the animation state by `dt` seconds.
 *
 * On a state change:
 *   • `elapsed` resets to 0
 *   • `blendIn` resets to 0 (will ramp to 1 over subsequent ticks)
 *   • `prevName` records the outgoing state name for GLB cross-fade
 *
 * While the state is stable:
 *   • `elapsed` increments
 *   • `blendIn` ramps toward 1 based on `getTransitionDuration(name)`
 *   • `prevName` is cleared once `blendIn` reaches 1
 */
export function tickAnimationState(
  state: AnimationState,
  desired: AnimationStateName,
  dt: number
): AnimationState {
  if (state.name !== desired) {
    return { name: desired, elapsed: 0, blendIn: 0, prevName: state.name };
  }

  const duration   = getTransitionDuration(state.name);
  const newBlendIn = duration > 0 ? Math.min(state.blendIn + dt / duration, 1) : 1;
  const newPrevName = newBlendIn >= 1 ? null : state.prevName;

  return {
    ...state,
    elapsed:  state.elapsed + dt,
    blendIn:  newBlendIn,
    prevName: newPrevName,
  };
}

// ---------------------------------------------------------------------------
// Procedural motion helpers  (primitive-fallback path only)
// ---------------------------------------------------------------------------

/**
 * Vertical bob amount for the given animation state.
 * Used to offset the root transform each frame (primitive meshes only).
 */
export function getProceduralBob(state: AnimationState): number {
  const { name, elapsed } = state;
  switch (name) {
    case "idle":
      return Math.sin(elapsed * 1.2) * 0.04;
    case "dribble_idle":
      return Math.sin(elapsed * 3.0) * 0.09;
    case "jog":
      return Math.abs(Math.sin(elapsed * 5.0)) * 0.14;
    case "shuffle":
      return Math.abs(Math.sin(elapsed * 4.5)) * 0.10;
    case "run":
      return Math.abs(Math.sin(elapsed * 8.0)) * 0.20;
    case "defensive_stance":
      return Math.sin(elapsed * 1.8) * 0.03 - 0.12; // crouched
    case "shoot":
      // Rise up during the shooting motion
      return Math.min(elapsed * 2.5, 1) * 0.30;
    case "pass":
      return Math.sin(elapsed * 6.0) * 0.06;
    case "rebound":
      return Math.abs(Math.sin(elapsed * 7.0)) * 0.18;
    case "celebrate":
      return Math.abs(Math.sin(elapsed * 4.0)) * 0.25;
    default:
      return 0;
  }
}

/**
 * Returns the procedural arm-raise ratio for shoot/pass states (0–1).
 * The head mesh is offset upward by this amount (primitive meshes only).
 */
export function getArmRaise(state: AnimationState): number {
  switch (state.name) {
    case "shoot":
      return Math.min(state.elapsed * 3.5, 1);
    case "pass":
      return Math.min(state.elapsed * 4.0, 0.6);
    default:
      return 0;
  }
}

/**
 * Returns a lateral lean in radians for locomotion states.
 * Gives a subtle side-to-side sway while moving (primitive meshes only).
 */
export function getProceduralLean(state: AnimationState): number {
  switch (state.name) {
    case "jog":
      return Math.sin(state.elapsed * 5.0) * 0.04;
    case "run":
      return Math.sin(state.elapsed * 8.0) * 0.07;
    default:
      return 0;
  }
}
