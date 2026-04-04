/**
 * Shared fixed-timestep parameters for the simulation driver (useSimLoop).
 * Kept in a pure module for unit tests and a single source of truth.
 */

/** Fixed simulation step in seconds (60 Hz). */
export const FIXED_DT = 1 / 60;

/** Cap real time added to the accumulator per frame (avoids spiral-of-death after backgrounding). */
export const MAX_ACCUMULATED_SEC = 0.25;

/** Maximum fixed steps per render frame (keeps the main thread responsive). */
export const MAX_STEPS_PER_FRAME = 5;

/**
 * Scale engine delta by game speed and clamp to MAX_ACCUMULATED_SEC.
 */
export function boundedSimDeltaSeconds(dtMs: number, gameSpeed: number): number {
  if (dtMs <= 0 || gameSpeed <= 0) return 0;
  return Math.min((dtMs / 1000) * gameSpeed, MAX_ACCUMULATED_SEC);
}
