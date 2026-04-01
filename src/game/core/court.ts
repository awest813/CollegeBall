/**
 * Court constants and utility helpers.
 *
 * College basketball court dimensions (in feet, mapped 1:1 to world units):
 *   Length = 94 ft,  Width = 50 ft
 *
 * We centre the court at the origin so:
 *   x ∈ [−47, 47]   (baseline to baseline)
 *   y ∈ [−25, 25]    (sideline to sideline)
 *
 * The "home" basket is at x = −43 (left), "away" basket at x = 43 (right).
 */

import type { CourtPosition, PossessionTeam } from "../types";

export const COURT_LENGTH = 94;
export const COURT_WIDTH = 50;
export const HALF_LENGTH = COURT_LENGTH / 2; // 47
export const HALF_WIDTH = COURT_WIDTH / 2; // 25

/** Basket x-positions (4 ft inside each baseline). */
export const BASKET_X_HOME = -43;
export const BASKET_X_AWAY = 43;

/** Three-point arc radius (NCAA ≈ 22.15 ft). */
export const THREE_POINT_RADIUS = 22.15;

/** Free-throw line distance from basket centre (15 ft). */
export const FREE_THROW_DISTANCE = 15;

/** Get the basket position for a given team. */
export function basketPosition(team: PossessionTeam): CourtPosition {
  return { x: team === "home" ? BASKET_X_HOME : BASKET_X_AWAY, y: 0 };
}

/** Get the offensive half-court centre for a team. */
export function offensiveCenter(team: PossessionTeam): CourtPosition {
  return { x: team === "home" ? -HALF_LENGTH / 2 : HALF_LENGTH / 2, y: 0 };
}

/** Clamp a position to stay within court bounds (with small padding). */
export function clampToCourt(pos: CourtPosition): CourtPosition {
  const pad = 1;
  return {
    x: Math.max(-HALF_LENGTH + pad, Math.min(HALF_LENGTH - pad, pos.x)),
    y: Math.max(-HALF_WIDTH + pad, Math.min(HALF_WIDTH - pad, pos.y)),
  };
}

/** Euclidean distance between two court positions. */
export function distance(a: CourtPosition, b: CourtPosition): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Linear interpolation between two positions. */
export function lerpPosition(
  a: CourtPosition,
  b: CourtPosition,
  t: number
): CourtPosition {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}
