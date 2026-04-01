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
 */

import type { SimPlayer, AnimationStateName } from "../types";

// Re-export so callers only need to import from this module
export type { AnimationStateName } from "../types";

// ---------------------------------------------------------------------------
// State value object
// ---------------------------------------------------------------------------

export interface AnimationState {
  name: AnimationStateName;
  /** Elapsed seconds in the current state (reset on transition). */
  elapsed: number;
  /** Blend weight — reserved for future clip blending (0–1). */
  weight: number;
}

export function makeIdleAnimState(): AnimationState {
  return { name: "idle", elapsed: 0, weight: 1 };
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
}

// ---------------------------------------------------------------------------
// Speed thresholds
// ---------------------------------------------------------------------------

const IDLE_THRESHOLD = 0.8; // ft/s — below this player is effectively still
const JOG_THRESHOLD = 10; // ft/s — below this → jog, above → run

// ---------------------------------------------------------------------------
// State resolution
// ---------------------------------------------------------------------------

/** Determine the desired AnimationStateName from the current context. */
export function resolveAnimationState(
  ctx: PlayerAnimContext,
  current: AnimationState
): AnimationStateName {
  // Hold shoot follow-through briefly after releasing the ball
  if (
    current.name === "shoot" &&
    current.elapsed < 0.35 &&
    !ctx.hasBall
  ) {
    return "shoot";
  }

  if (ctx.hasBall) {
    if (ctx.speed < IDLE_THRESHOLD) return "dribble_idle";
    if (ctx.speed < JOG_THRESHOLD) return "jog";
    return "run";
  }

  if (ctx.isDefending) {
    if (ctx.speed < IDLE_THRESHOLD) return "defensive_stance";
    if (ctx.speed < JOG_THRESHOLD) return "shuffle";
    return "run";
  }

  if (ctx.speed < IDLE_THRESHOLD) return "idle";
  if (ctx.speed < JOG_THRESHOLD) return "jog";
  return "run";
}

// ---------------------------------------------------------------------------
// State tick (transition + elapsed time)
// ---------------------------------------------------------------------------

/**
 * Advance the animation state by `dt` seconds.
 * Transitions are instant; real clip blending can be added here later.
 */
export function tickAnimationState(
  state: AnimationState,
  desired: AnimationStateName,
  dt: number
): AnimationState {
  if (state.name !== desired) {
    return { name: desired, elapsed: 0, weight: 1 };
  }
  return { ...state, elapsed: state.elapsed + dt };
}

// ---------------------------------------------------------------------------
// Procedural motion helpers
// ---------------------------------------------------------------------------

/**
 * Vertical bob amount for the given animation state.
 * Used to offset the root transform each frame.
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
 * The head mesh is offset upward by this amount.
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
 * Gives a subtle side-to-side sway while moving.
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
